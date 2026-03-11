import subprocess
import paramiko
import os
from dotenv import load_dotenv
load_dotenv() # 加载同目录下的 .env 文件

# 从环境变量读取，读不到则使用默认值
DOCKERHUB_USER = os.getenv("DOCKERHUB_USER")
REMOTE_IP = os.getenv("REMOTE_IP")
REMOTE_USER = os.getenv("REMOTE_USER")
# 自动定位 Ed25519 密钥路径 (Windows 通常在 C:\Users\用户名\.ssh\id_ed25519)
SSH_KEY_PATH = os.path.expanduser("~/.ssh/id_ed25519")

PROJECT_CONFIG = {
    "1": {
        "display_name": "后端 (Backend)",
        "path": r"D:\IdeaProgram\VnollxOnlineJudge",
        "image": "vnollx",
        "container": "vnollx",
        "port": "8080:8080",
        "network": "app-network"
    },
    "2": {
        "display_name": "前端 (Frontend)",
        "path": r"D:\IdeaProgram\VnollxOnlineJudge\frontend",
        "image": "vnollx-web",
        "container": "vnollx-web",
        "port": "3000:3000",
        "network": "app-network"
    }
}


def check_docker_environment():
    """校验本地 Docker 状态及登录状态"""
    print(f"🔍 正在校验本地 Docker 状态...", end='', flush=True)
    try:
        subprocess.run("docker info", shell=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("【已启动】")
    except subprocess.CalledProcessError:
        print("【未启动】")
        print("❌ 错误: 请先启动 Docker Desktop！")
        return False

    print(f"🔑 正在校验 Docker Hub 登录状态...", end='', flush=True)
    try:
        subprocess.run("docker login", shell=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("【已登录】")
        return True
    except subprocess.CalledProcessError:
        print("【未登录】")
        print("\n❌ 错误: 检测到未登录 Docker Hub。")
        print("💡 请先在 Docker Desktop 登录，或在终端执行: docker login")
        return False


def start_deploy():
    # 0. 环境检查
    if not check_docker_environment():
        return

    # 1. 密钥文件检查
    if not os.path.exists(SSH_KEY_PATH):
        print(f"❌ 错误: 找不到密钥文件 {SSH_KEY_PATH}")
        print("💡 请确认该路径下存在 id_ed25519 文件。")
        return

    print("=" * 45)
    print("      Vnollx OJ 自动化部署系统 v4.4")
    print("=" * 45)
    print("1. 部署后端 (vnollx)")
    print("2. 部署前端 (vnollx-web)")
    choice = input("\n请选择部署目标 (1/2): ").strip()

    if choice not in PROJECT_CONFIG:
        print("❌ 输入错误")
        return

    config = PROJECT_CONFIG[choice]
    version = input(f"请输入 {config['display_name']} 的版本号: ").strip()
    if not version:
        print("❌ 错误：版本号不能为空")
        return

    remote_tag = f"{DOCKERHUB_USER}/{config['image']}:{version}"

    try:
        # --- 阶段 1: 本地阶段 ---
        print(f"\n[本地阶段: {config['display_name']}]")

        print(f"🛠️  正在构建本地镜像 (强制无缓存)...", end='', flush=True)
        subprocess.run(f"docker build --no-cache -t {config['image']} .",
                       shell=True, check=True, cwd=config['path'], stdout=subprocess.DEVNULL)
        print("【完成】")

        print(f"🏷️  正在标记并推送至仓库...", end='', flush=True)
        subprocess.run(f"docker tag {config['image']} {remote_tag}", shell=True, check=True)
        subprocess.run(f"docker push {remote_tag}", shell=True, check=True, stdout=subprocess.DEVNULL)
        print("【完成】")

        # --- 阶段 2: 远程阶段 ---
        print(f"\n[远程阶段: {REMOTE_IP}]")

        print(f"🔗 正在建立 SSH 连接 (Ed25519 密钥)...", end='', flush=True)
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        # 核心修改：使用密钥连接
        ssh.connect(REMOTE_IP, username=REMOTE_USER, key_filename=SSH_KEY_PATH)
        print("【完成】")

        remote_cmds = [
            ("📥 正在从仓库拉取镜像...", f"docker pull {remote_tag}"),
            ("🛑 正在停止旧容器...", f"docker stop {config['container']} || true"),
            ("🗑️  正在删除旧容器...", f"docker rm {config['container']} || true"),
            ("🚀 正在启动新容器...",
             f"docker run -d --name {config['container']} --network {config['network']} -p {config['port']} {remote_tag}"),
            ("🧹 正在清理冗余镜像...", "docker image prune -f")
        ]

        for msg, cmd in remote_cmds:
            print(msg, end='', flush=True)
            stdin, stdout, stderr = ssh.exec_command(cmd)
            stdout.channel.recv_exit_status()
            print("【完成】")

        ssh.close()
        print("\n" + "=" * 45)
        print(f"✨ {config['display_name']} (版本: {version}) 部署圆满成功！")

    except Exception as e:
        print(f"\n\n❌ 部署失败！")
        print(f"错误详情: {e}")


if __name__ == "__main__":
    start_deploy()