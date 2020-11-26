#!/usr/bin/env node
/**
 * make a bundle of all the examples for POSTing to a server as a transaction
 * 
 * execute: ./makeTerminology {IG}
 * 
 * 
 * */


let server = "http://home.clinfhir.com:8054/baseR4/"
let fs = require('fs');
let igRoot = "/Users/davidhay/IG/";

//retrieve the IG
//console.log(process.argv);

let igName = process.argv[2];   
if (!igName) {
    console.log("No IG specified. Must be in the command eg: ./makeExampleBundle nhi")
    return;
}

let fullPath = igRoot + igName;



if ( ! fs.existsSync(fullPath)) {
    console.log("The IG '" + igName + "' does not exist (at least, there is no folder with that name.")
    return;
}

let rootPath = igRoot + igName +  "/input/examples/";


let outFile = igRoot + igName + "/fsh/examples/generatedExamples.json";
//let outFile1 = igRoot + igName + "/input/pagecontent/NamingSystems.md";  // for IG publisher

console.log('Building example bundle for ' + igName)
console.log("IG is located at "+ fullPath);
console.log('Location of examples:' + rootPath)


let bundle = {resourceType:'Bundle',type:'transaction',entry:[]}
fs.readdirSync(rootPath).forEach(function(file) {
    if (file.substr(0,1) !== '.') {
        let fullFileName = rootPath + file;
        let contents = fs.readFileSync(fullFileName, {encoding: 'utf8'});
        let resource = JSON.parse(contents)
        //don't include bundles
        if (resource.resourceType !== 'Bundle') {
            let entry = {resource:resource}
            entry.request = {method:'PUT',url:resource.resourceType + "/" + resource.id}
            console.log(resource)
            bundle.entry.push(entry)
        }

    }
   
})

fs.writeFileSync(outFile,JSON.stringify(bundle))

return;

let arNS = []



arNS.push("### Identifiers");

let nsText = `
<div>
These are identifiers defined in this IG. They are defined using <a href='http://hl7.org/fhir/namingsystem.html'>NamingSystem</a> resources.
</div>
`
arNS.push(nsText);

arNS.push("<table class='table table-bordered table-condensed'>");

arNS.push("<tr><th>Description</th><th>Url</th><th>Other identifiers</th><th>Responsible</th></tr>")


fs.readdirSync(rootPath).forEach(function(file) {

    let ar = file.split('-')
    switch (ar[0]) {
        case 'NamingSystem' :
            let ns = loadFile(file);
            //console.log(ns)
            let otherId =[];        //to record other ids than url
            let nsLne = "<tr>";
            nsLne += "<td>" + ns.description + "</td>";
            nsLne += "<td>" 
            if (ns.uniqueId) {
                ns.uniqueId.forEach(function(id){
                    if (id.type == "uri" && id.preferred == true) {
                        nsLne += "<div>" + id.value + "</div>"
                    } else {
                        otherId.push(id)
                    }
                })
            }
            nsLne += "</td>" 

            //Other Ids (if any)
            nsLne += "<td>" 
            if (otherId.length > 0) {
                if (otherId.length > 0) {
                    nsLne += "<ul>" 
                    otherId.forEach(function(id){
                        nsLne += "<li>" + id.value + " (" + id.type + ") " + id.comment +   "</li>"
                    })
                    nsLne += "</ul>" 
                }
            }
            nsLne += "</td>" 
           
            nsLne += "<td>" + ns.responsible + "</td>";


            nsLne += "</tr>"
            arNS.push(nsLne)
            break;
    }

})
arNS.push("</table>")
arNS.push("<br/><br/>")
//arVS.push("\r\n")




let fle = arNS.join('\r\n');
fs.writeFileSync(outFile,fle);      //in sushi
fs.writeFileSync(outFile1,fle)      //for ig pub



function loadFile(path) {
    let fullFileName = rootPath + path;
    let contents = fs.readFileSync(fullFileName, {encoding: 'utf8'});
    let resource = JSON.parse(contents)
    return resource;
}

