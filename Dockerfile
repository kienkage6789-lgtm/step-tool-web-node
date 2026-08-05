# Sử dụng base image Python để cài đặt dễ dàng thư viện CadQuery
FROM python:3.10-slim

# Cập nhật hệ thống và cài đặt Node.js (phiên bản 20)
RUN apt-get update && apt-get install -y \
    curl \
    libgl1 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy package.json và cài đặt thư viện Node.js
COPY package*.json ./
RUN npm install

# Copy file requirements.txt và cài thư viện Python
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn vào container
COPY . .

# Thông báo cho hệ thống biết port sẽ sử dụng
EXPOSE 3000

# Lệnh chạy server khi container khởi động
CMD ["npm", "start"]
