# Fridge Assistant 后端

## 快速开始

```bash
cd backend
python -m venv venv
source venv/bin/activate  # macOS/Linux
# source venv/Scripts/activate  # Windows

pip install -r requirements.txt

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API 文档

启动后访问：http://localhost:8000/docs

## 部署（NAS）

```bash
# 在 NAS 上
cd ~/fridge-assistant/backend
pip install -r requirements.txt
nohup uvicorn main:app --host 0.0.0.0 --port 8000 &
```
