@echo off
echo [1/4] Sobirayu frontend...
npm run build

echo [2/4] Otpravlyayu frontend na server...
scp -r dist\* root@109.73.199.190:/var/www/babyborz.shop/

echo [3/4] Otpravlyayu backend na server...
scp -r backend\* root@109.73.199.190:/var/www/inventory-app/backend/

echo [4/4] Perезапускаю prilozhenie...
ssh root@109.73.199.190 "/root/restart-app.sh"

echo Gotovo! Obnovlenie zaversheno.
pause