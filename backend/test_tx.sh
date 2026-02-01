#!/bin/bash
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email": "test@example.com", "password": "password123"}' http://localhost:3000/auth/login | jq -r .token)
echo "Token: $TOKEN"

echo "Creating Installment Transaction..."
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
 -d '{
   "description": "MacBook",
   "amount": 12000,
   "date": "2023-01-01T00:00:00Z",
   "type": "EXPENSE",
   "status": "PAID",
   "category": "Tech",
   "isInstallment": true,
   "totalInstallments": 10
 }' http://localhost:3000/transactions

echo -e "\n\nChecking Transactions count..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/transactions | jq '. | length'
