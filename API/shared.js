const puppeteer = require('puppeteer');

var browser = null;
module.exports.screnshotForUrlTab = async function (url, isfullPage) {
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
                width: 1280,
                height: 900,
                isMobile: false,
                deviceScaleFactor: 1,
            });

            //scroll the whole page for lazy loading
            //await autoScroll(page);

            //wait for the page to be fully loaded - max 1000ms wait
            /*
            try{
                await page.waitForNavigation({waitUntil: 'networkidle2', timeout: 1000});
            } catch(ex){

            }
            */

            buffer = await page.screenshot({ 
                //type:'png', 
                type:'jpeg', 
                quality: 88, 
                encoding: 'binary',
                fullPage: isfullPage
            });
            //await browser.close();
            await page.close();

            let mimeType = "image/jpeg";            
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

module.exports.screnshotForUrl = async function (url, isfullPage) {
    return new Promise(async function (resolve, reject) {

        var timestamp = (+new Date());
        var buffer = null;
        var browser = null;
        try {

            browser = await puppeteer.launch({args: ['--no-sandbox']});
            const page = await browser.newPage();
            await page.goto(url);

            await page.setViewport({
                width: 1280,
                height: 900,
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
            

            buffer = await page.screenshot({ 
                type:'jpeg', 
                quality: 84, 
                encoding: 'binary',
                fullPage: isfullPage
            });
            await browser.close();

            let mimeType = "image/jpeg";            
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
      let distance = 500
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight
        window.scrollBy(0, distance)
        totalHeight += distance
        if(totalHeight >= scrollHeight){
          clearInterval(timer)
          resolve()
        }
      }, 100)
    })
  })
}

module.exports.sleep = function (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}   