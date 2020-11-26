#!/usr/bin/env node
/*create an example page containing all the examples in the Guide

Iterate through all the examples to create a summary page 
The summary by base type uses the //BaseType entry that is in all instances as a comment.
The output is places in the pagecontent folder of both fsh and input so that it can be run
as part of the runSushi command ()

Uses fsh for the summary by type (baseType), actual generated instances for the Composition

*/

let igRoot = "/Users/davidhay/IG/";
let fs = require('fs')
let syncRequest = require('sync-request');


//get the IG name
let igName = process.argv[2];   
if (!igName) {
    console.log("No IG specified. Must be in the command eg: ./makeExamplePage nhi")
    return;
}

let fullPath = igRoot + igName;

if ( ! fs.existsSync(fullPath)) {
    console.log("The IG '" + igName + "' does not exist (at least, there is no folder with that name.")
    return;
}

let rootPath = igRoot + igName;     //the path to the root of the IG




//where to write out the bundles (that represent the document examples). The IG publisher can pick them up from there
let arBundleOutputFolder = ['./input/examples/','./fsh/ig-data/input/examples/'];            //where to save a bundle

let outFileName = rootPath + '/fsh/ig-data/input/pagecontent/examples.md';
let outFileName2 = rootPath + '/input/pagecontent/examples.md';      //also put a copy directly in the IG input - otherwise have to run sushi again

let examplePath =   rootPath +'/fsh/examples'

let bundleServer = "http://clinfhir.com/fhir/";          //root for full url

let dataServer = "http://home.clinfhir.com:8054/baseR4/";   //upload Bundles to this server
let bvServer = "http://clinfhir.com/bundleVisualizer.html";        //the link to the Bundle Visualizer

let FhirExamplePath = rootPath +  '/input/examples/' //where the example FHIR instances are placed by sushi

//retrieve all the file names into a list
let results = walk(examplePath)
console.log(results)

//return;


let hashExamples = {};      //hash by InstanceOf: contains [{id:, description:, title:, type:, fileName:, link:}] for each key

//process the files - build the hash hashExamples (a single file can have multiple instances in it). 
results.forEach(function(fullFileName) {
    let contents = fs.readFileSync(fullFileName).toString()
    processFile(contents,fullFileName)
})

//console.log(hashExamples)



//now iterate through hashExamples to build the summary by type
let arMD = []
arMD.push("### Examples by Type")
arMD.push("");

arMD.push("<table>");
arMD.push("<tr><th> Type </th><th> Id </th><th> Title </th><th> Description </th></tr>")

arBundles = []
arBundles.push("### Bundles")
arBundles.push("");

arBundles.push("<table>");
arBundles.push("<tr><th> Id </th><th> Title </th><th> Description </th></tr>")

//arMD.push("| Type | Id | Title | Description |")
//arMD.push("| --- | --- | --- | --- |")


for (var key of Object.keys(hashExamples)) {        //key is the 'instanceOf'
    let ctr = 0;
    hashExamples[key].forEach(function(summary){    //multiple examples for each instance
        let linkId = summary.id
        if (summary.link) {
            console.log('make link')
            //linkId = "[" + summary.id + "](" + summary.link + ")"
            linkId = "<a href='"+summary.link+"'>" + summary.id + "</a>"
        }
//console.log(linkId)
        //only display the key once...

        //let keyDisplay = key;
        //let keyDisplay = "[" + key +"](StructureDefinition-" + key + ".html)"
        let keyDisplay = "<a href='StructureDefinition-" + key + ".html'>" + key + "</a>"  

        if (ctr > 0) {
            keyDisplay = ""
        }


        let lne = "<tr>";
            lne += "<td>" + keyDisplay + "</td>";
            lne += "<td>" + linkId + "</td>";
            lne += "<td>" + summary.title + "</td>";
            lne += "<td>" + summary.description + "</td>";

            lne += "</tr>"
            arMD.push(lne);
            ctr ++


        if (key == "Bundle") {
            let lne = "<tr>";

            let bvUrl = bvServer + "?id=" + summary.id + "&server=" + dataServer
            //let bvLink = "<a href='"+bvUrl+"' target='_blank'>View in clinFHIR Bundle Visualizer</a>";
            let bvLink = "<a href='"+bvUrl+"' target='_blank'>"+summary.id+"</a>";
            
            //let lnk 
           
            lne += "<td>" + bvLink + "</td>";
            lne += "<td>" + summary.title + "</td>";
            lne += "<td>" + summary.description + "</td>";


            lne += "</tr>"
            arBundles.push(lne);

            //now push the bundle to the server
            //load the bundle
            let bundleFileName = FhirExamplePath + "Bundle-"+summary.id + ".json";
            let contents = fs.readFileSync(bundleFileName).toString()

            //need to change the type to 'collecction'
            let json = JSON.parse(contents)
            json.type = "collection"

            let url = dataServer + "Bundle/" + summary.id
            // ... and save
            let options = {};
            options.headers = {"content-type": "application/fhir+json"}
            options.body = JSON.stringify(json)
            options.timeout = 20000;        //20 seconds
            
            //console.log(options)

            
            //console.log(url)
            let response = syncRequest('PUT', url, options);
            console.log('Response to saving at ' + url + ": " + response.statusCode)

        } else {
           /* let lne = "<tr>";
            lne += "<td>" + keyDisplay + "</td>";
            lne += "<td>" + linkId + "</td>";
            lne += "<td>" + summary.title + "</td>";
            lne += "<td>" + summary.description + "</td>";

            lne += "</tr>"
            arMD.push(lne);
            ctr ++
            */
        }
       
    })
}

arBundles.push("</table>");
arMD.push("</table>");


//now assemble the page
let ar = arMD.concat(arBundles)


let outContents = ar.join('\n')


//let outContents = arMD.join('\n')
fs.writeFileSync(outFileName,outContents)       //This is sushi ig-data
fs.writeFileSync(outFileName2,outContents)      //This is the IG input





function makeLinkFromReference(ref) {
    let ar = ref.split('/')
    //console.log(ref,ar.join('-'))
    return ar.join('-')
}

function getDivText(text) {
    let g = text.indexOf('>')
    let g1 = text.indexOf("<",1)
    return text.substr(g+1,g1-g-1)
}





//get all the instance defintions in the file...
function processFile(contents,fullFileName) {
    let splitter = "Instance:"
    //let arResults = []
    let arInstances = contents.split(splitter);     //the instances defined in this file

    arInstances.forEach(function(i) {       //check each instance

        let fileContents = splitter + i     //add back in the splitter
        
        let summary = {description:"",title:""}
        let ar = fileContents.split('\n')
        ar.forEach(function(lne){
            lne = lne.replace(/['"]+/g, '');        //get rid of all the quotes
            if (lne.substr(0,11) == 'InstanceOf:') {
                summary.type = lne.substr(12)
            } else if (lne.substr(0,9) == 'Instance:') {
                let id = (lne.substr(10))
                summary.id = id.trim();
            } else if (lne.substr(0,11) == '//BaseType:') {
                summary.baseType = lne.substr(12).trim();
            } else if (lne.substr(0,6) == 'Title:') {
                summary.title = lne.substr(7)
            } else if (lne.substr(0,12) == 'Description:') {
                summary.description = lne.substr(13)
            }
        })

        if (summary.type && summary.id) {
            //summary.content = fileContents;
           
            summary.fileName = fullFileName
            if (summary.baseType) {
                summary.link = summary.baseType + "-" + summary.id + ".json.html"
            }
            
            hashExamples[summary.type] = hashExamples[summary.type] || []
            hashExamples[summary.type].push(summary);
        }


        //console.log(summary.id)

    })
   


}

function assembleSectionText(section) {

}


//get all the FSH files in the directory & descendents
function walk(dir) {
    let results = [];
    let list = fs.readdirSync(dir);
    list.forEach(function(file) {
        if (file.substr(0,1) !== '.') {     //ignore hidden files
            file = dir + '/' + file;
            let stat = fs.statSync(file);
            if (stat && stat.isDirectory()) { 
                /* Recurse into a subdirectory */
                results = results.concat(walk(file));
            } else { 
                //Is a file - add if a FSH file
                if (file.substr(file.length-4,4) =='.fsh') {
                    results.push(file); 
                }         
                               
            }
        }
        
    });
    return results;
}

