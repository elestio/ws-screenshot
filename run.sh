###RUN ON PORT 3000
node index.js -r ./ -p 3000 --oc 1
###DEV
# node index.js -r ./ -p 3000 --d 1

###RUN ON PORT 80 + 443 with AutoSSL
#node index.js -r ./ -p 80 --ssl --sslport 443 --ssldomain www.yourdomain.com --oc 1