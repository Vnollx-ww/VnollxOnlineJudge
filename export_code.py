import os

# 配置需要扫描的目录（根据您的项目结构）
SOURCE_DIRS = [
    r'src/main/java',  # 后端代码
    r'web/src'  # 前端代码
]

# 配置需要包含的文件后缀
EXTENSIONS = {'.java', '.jsx', '.js', '.css', '.xml'}

# 输出文件名
OUTPUT_FILE = 'source_code_for_copyright.txt'


def is_code_file(filename):
    return any(filename.endswith(ext) for ext in EXTENSIONS)


def clean_line(line):
    """去除空白行和尾部空格"""
    return line.rstrip()


def main():
    line_count = 0
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        for src_dir in SOURCE_DIRS:
            for root, dirs, files in os.walk(src_dir):
                for file in files:
                    if is_code_file(file):
                        file_path = os.path.join(root, file)
                        try:
                            with open(file_path, 'r', encoding='utf-8') as infile:
                                outfile.write(f"// File: {file}\n")  # 标记文件名
                                for line in infile:
                                    cleaned = clean_line(line)
                                    if cleaned:  # 去除完全空行
                                        outfile.write(cleaned + '\n')
                                        line_count += 1
                        except Exception as e:
                            print(f"Skipping file {file}: {e}")

    print(f"完成！已生成 {OUTPUT_FILE}")
    print(f"总行数: {line_count}")
    print(
        "请打开该文件，复制到 Word 中，调整字体为 Consolas/Courier New，字号 10 或 小五，设置行间距为固定值，确保每页约 50 行。")


if __name__ == '__main__':
    main()