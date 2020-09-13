const puppeteer = require('puppeteer');

var browser = null;
module.exports.screnshotForUrlTab = async function (url, isfullPage, resX, resY, outFormat) {
    return new Promise(async function (resolve, reject) {

        var timestamp = (+new Date());
        var buffer = null;
        try{

            if ( browser == null){
                browser = await puppeteer.launch({args: ['--no-sandbox']});
            }
            
            //const browser = await puppeteer.launch({args: ['--no-sandbox']});
            const page = await browser.newPage();
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
                await page.waitForNavigation({waitUntil: 'networkidle2', timeout: 100});
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
                details: ex,
                mimeType: "application/json"
            };
            reject(resp);
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

module.exports.screnshotForUrl = async function (url, isfullPage, resX, resY, outFormat) {
    return new Promise(async function (resolve, reject) {

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
                //await page.waitForNavigation({waitUntil: 'networkidle2', timeout: 1000});
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