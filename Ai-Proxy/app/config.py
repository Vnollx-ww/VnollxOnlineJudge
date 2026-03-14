from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MySQL 数据库配置
    db_host: str = "111.230.105.54"
    db_port: int = 3308
    db_user: str = "root"
    db_password: str = "rootpassword"
    db_name: str = "vnollxonlinejudge"

    # Java 后端地址（用于回调）
    java_backend_url: str = "http://111.230.105.54:8080"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
