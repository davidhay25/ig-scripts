#!/usr/bin/env node
/**
 * Upload all the terminology resources for the given IG to a server.

 * */

 let fs = require('fs');
 let axios = require('axios')
 let igRoot = "/Users/davidhay/IG/";

 //the server used to hold term. resources from the IG
 //let igServer = "http://home.clinfhir.com:8054/baseR4/"
 //let igServer = "http://hapi.fhir.org/baseR4/"
 let igServer = "https://r4.ontoserver.csiro.au/fhir/"

 
 let igName = process.argv[2];   
 if (!igName) {
     console.log("No IG specified. Must be in the command eg: ./uploadTerminology.js nhi")
     return;
 }
 
 let fullPath = igRoot + igName;
 
 if ( ! fs.existsSync(fullPath)) {
     console.log("The IG '" + igName + "' does not exist (at least, there is no folder with that name.")
     return;
 }
 

 let rootPath = igRoot + igName +  "/fsh-generated/resources/";
 let outFile = igRoot + igName + "/generated/auditTerminology.json"

 
 console.log('Auditing terminology for ' + igName)
 console.log("IG is located at "+ fullPath);
 console.log('Location of terminology:' + rootPath)
 console.log('Writing report to ' + outFile)

 //----------------- ValueSets
 //read all the 

 
 //upload all the Codesystems and Valuesets first
 let ctr = 1
 fs.readdirSync(rootPath).forEach(function(file) {
    //console.log(file)
    let ar = file.split('-')
    let resource = loadFile(file)
    let id = resource.id
    let url = igServer + resource.resourceType + "/" + id

    switch (ar[0]) {
        case 'ValueSet' :
        case 'CodeSystem': 
        
        ctr ++

        setTimeout(function(){
            putFile(url,resource)
        },1000* ctr)
        

    }
})



async function putFile(url,resource) {
    try {
      const response = await axios.put(url,resource);
      console.log("success: " + url);
     return true

      
    } catch (error) {
        console.log("fail: " + url);
        console.log(error.response.data)
        return false
    }
  }

 
function loadFile(path) {
    let fullFileName = rootPath + path;
    let contents = fs.readFileSync(fullFileName, {encoding: 'utf8'});
    let resource = JSON.parse(contents)
    return resource;
}

 