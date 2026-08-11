# Sử dụng base image Node.js phiên bản 20 slim siêu nhẹ
FROM node:20-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy package.json và cài đặt thư viện Node.js
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Thông báo cho hệ thống biết port sẽ sử dụng
EXPOSE 3000

# Lệnh chạy server khi container khởi động
CMD ["npm", "start"]

