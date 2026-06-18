from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    AWS_ACCESS_KEY_ID: str = ''
    AWS_SECRET_ACCESS_KEY: str = ''
    AWS_REGION: str = 'ap-south-1'
    S3_BUCKET_NAME: str = 'hma-iems-documents'

    ENVIRONMENT: str = 'development'

    class Config:
        env_file = '.env'


settings = Settings()
