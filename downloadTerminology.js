#!/usr/bin/env node
/**
Download all the terminology resources for bound valuesets in the IG
 * */

 let fs = require('fs');
 let igRoot = "/Users/davidhay/IG/";
 let termServer = "https://terminz.azurewebsites.net/fhir/"        //where the reosurces are held
 
 //retrieve the IG
 //console.log(process.argv);
 
 let igName = process.argv[2];   
 if (!igName) {
     console.log("No IG specified. Must be in the command eg: ./makeNamingSystemSummary nhi")
     return;
 }
 
 let fullPath = igRoot + igName;
 
 
 if ( ! fs.existsSync(fullPath)) {
     console.log("The IG '" + igName + "' does not exist (at least, there is no folder with that name.")
     return;
 }
 
 let rootPath = igRoot + igName +  "/fsh-generated/resources/";
 
 
 //let outFile = igRoot + igName + "/fsh/ig-data/input/pagecontent/NamingSystems.md";
 let outFile1 = igRoot + igName + "/input/pagecontent/namingSystems.md";  // for IG publisher
 
 console.log('Download resources for ' + igName)
 console.log("IG is located at "+ fullPath);
 console.log('Location of terminology:' + rootPath)
 console.log('Writing output to ' + outFile1)

 //first create a list of all the terminology referenced

 let hashValueSets = {}

 fs.readdirSync(rootPath).forEach(function(fileName) {
    console.log(fileName)
    let fullFileName = rootPath + fileName
    if (fileName.startsWith("StructureDef")){
        
        let contents = fs.readFileSync(fullFileName, {encoding: 'utf8'});
        let resource = JSON.parse(contents)
        if (resource.snapshot && resource.snapshot.element) {
            resource.snapshot.element.forEach(function (ed) {
                if (ed.binding) {
                    let vs = ed.binding.valueSet;
                    hashValueSets[vs] = hashValueSets[vs] || []
                    hashValueSets[vs].push(ed.path)
                }
            })
        }
    }
})

 console.log(hashValueSets)