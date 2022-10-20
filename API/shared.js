const puppeteer = require('puppeteer');

var browser = null;
module.exports.screnshotForUrlTab = async function (
    url,
    isfullPage,
    resX,
    resY,
    outFormat,
    waitTime,
    proxy_server,
    pathToExtension,
) {
    return new Promise(async function (resolve, reject) {

        try{
            waitTime = parseInt(waitTime);
            //prevent never finishing wait
            if ( waitTime == 0) {
                waitTime = 1;
            }
        } catch(ex) {
            waitTime = 100;
        }

        var timestamp = (+new Date());
        var buffer = null;
        try{

            var args = [
                '--no-sandbox',
                '--font-render-hinting=none',
                '--force-color-profile=srgb'
            ]

            var headless = true;

            if (pathToExtension != null){
                args.push(`--load-extension=${path_to_extension}`)
                args.push(`--disable-extensions-except=${path_to_extension}`)
                headless = 'chrome';
            }

            if (proxy_server != null){
                args.push(`--proxy-server=${proxy_server}`)
                args.push('--host-resolver-rules="MAP * ~NOTFOUND , EXCLUDE proxyhost"',)
            }

            if ( browser == null){
                browser = await puppeteer.launch(
                    {
                        headless: headless,
                        args: args,
                    }
                );
            }

            //const browser = await puppeteer.launch({args: ['--no-sandbox']});
            const page = await browser.newPage();
            await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4950.0 Safari/537.36");
            await page.goto(url);

            await page.setViewport({
                width: parseInt(resX),
                height: parseInt(resY),
                isMobile: false,
                deviceScaleFactor: 1,
            });

            //scroll the whole page for lazy loading
            if (isfullPage){
                await autoScroll(page);
            }

            //wait for the page to be fully loaded - max 1000ms wait
            try{
                await page.waitForNavigation({waitUntil: 'networkidle2', timeout: waitTime});
            } catch(ex){
            }

            var finalType = "jpg";
            var finalMime = "image/jpeg";

            if ( outFormat == "jpg" ){
                finalType = "jpeg";
                finalMime = "image/jpeg";
            }
            else if ( outFormat == "png" ){
                finalType = "png";
                finalMime = "image/png";
            }
            else if ( outFormat == "pdf" ){
                finalType = "pdf";
                finalMime = "application/pdf";
            }

            var optionsPup = {
                type: finalType,
                encoding: 'binary',
                fullPage: isfullPage
            };

            if ( finalType == "jpeg" ){
                optionsPup.quality = 88;
            }

            if ( finalType != "pdf" ){
                buffer = await page.screenshot(optionsPup);
            }
            else{
                buffer = await page.pdf({printBackground: true, scale: 1, format: 'A4'});
            }

            //await browser.close();
            await page.close();

            let mimeType = finalMime;
            var resp = {
                mimeType: mimeType,
                data: buffer
            };

            resolve(resp);

        }
        catch(ex){
            console.log("Error while taking screenshot: " + ex.message);
            console.log(ex);

            try{
                //await browser.close();
            }catch(ex){

            }

            var resp = {
                status: "error",
                details: ex.message,
                mimeType: "application/json"
            };
            resolve(resp);
        }
    });
}

module.exports.CleanMemory = async function () {
    await CleanMem();
}

async function CleanMem(){
    if ( browser != null ){
        await browser.close();
        browser = null;
    }
}

module.exports.screnshotForUrl = async function (url, isfullPage, resX, resY, outFormat, waitTime) {
    return new Promise(async function (resolve, reject) {

        try{
            waitTime = parseInt(waitTime);
            //prevent never finishing wait
            if ( waitTime == 0) {
                waitTime = 1;
            }
        } catch(ex) {
            waitTime = 100;
        }

        var timestamp = (+new Date());
        var buffer = null;
        var browser = null;
        try {

            browser = await puppeteer.launch({args: ['--no-sandbox']});
            const page = await browser.newPage();

            var errorContent = "";
            await page.goto(url).catch(e => errorContent = e);

            //display error in the image
            if ( errorContent != "" ){
                page.setContent("<pre>" + errorContent.stack + "</pre>");
            }

            await page.setViewport({
                width: parseInt(resX),
                height: parseInt(resY),
                isMobile: false,
                deviceScaleFactor: 1,
            });

            //scroll the whole page for lazy loading
            await autoScroll(page);

            //wait for the page to be fully loaded - max 1000ms wait
            try{
                await page.waitForNavigation({waitUntil: 'networkidle2', timeout: waitTime});
            } catch(ex){

            }

            var finalType = "jpg";
            var finalMime = "image/jpeg";

            if ( outFormat == "jpg" ){
                finalType = "jpeg";
                finalMime = "image/jpeg";
            }
            else if ( outFormat == "png" ){
                finalType = "png";
                finalMime = "image/png";
            }
            else if ( outFormat == "pdf" ){
                finalType = "pdf";
                finalMime = "application/pdf";
            }

            buffer = await page.screenshot({
                type: finalType,
                quality: 84,
                encoding: 'binary',
                fullPage: isfullPage
            });
            await browser.close();

            let mimeType = finalMime;
            var resp = {
                mimeType: mimeType,
                data: buffer
            };

            resolve(resp);

        }
        catch(ex){
            console.log("Error while taking screenshot: " + ex.message);
            console.log(ex);

            try{
                await browser.close();
            }catch(ex){

            }

            var resp = {
                status: "error",
                details: ex,
                mimeType: "application/json"
            };
            reject(resp);
        }
    });
}


async function autoScroll (page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0
      let distance = 200
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight
        window.scrollBy(0, distance)
        totalHeight += distance
        if(totalHeight >= scrollHeight){
          clearInterval(timer)
          resolve()
        }
      }, 10)
    })
  })
}

module.exports.sleep = function (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
