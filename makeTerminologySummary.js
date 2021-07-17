#!/usr/bin/env node
/**
 * make the summary MD file for terminology
 * creates the page: /input/pagecontent/terminology.md
 * execute: ./makeTerminology {IG}
 * 
 * 
 * */

let fs = require('fs');
let igRoot = "/Users/davidhay/IG/";

let showRetired = false;

let audit = require(igRoot +'scripts/modules/auditTerminology.js')
//console.log(audit)


//import {checkUnusedVS} from 'module/auditTerminology.mjs'

//retrieve the IG
//console.log(process.argv);

let igName = process.argv[2];   
if (!igName) {
    console.log("No IG specified. Must be in the command eg: ./makeTerminology nhi")
    return;
}

let fullPath = igRoot + igName;

if ( ! fs.existsSync(fullPath)) {
    console.log("The IG '" + igName + "' does not exist (at least, there is no folder with that name.")
    return;
}


let rootPath = igRoot + igName +  "/fsh-generated/resources/";
let outFile = igRoot + igName + "/input/pagecontent/terminology.md";  // for IG publisher

let bundleFile = igRoot + igName + "/generated/terminology.json"

let bundle = {resourceType:'Bundle',type:'batch',entry:[]}

console.log('Building terminology summary for ' + igName)
console.log("IG is located at "+ fullPath);
console.log('Location of terminology:' + rootPath)
console.log('Writing output to ' + outFile)
//console.log(" and " + outFile1)
console.log("Bundle file " + bundleFile)

//return



/*
let rootPath = "input/vocabulary/";
//let outFile = "fsh/ig-data/input/pagecontent/terminology.xml";

let outFile = "fsh/ig-data/input/pagecontent/terminology.md";
let outFile1 = "input/pagecontent/terminology.md";  // for IG publisher
*/
//let arFile = []
let arCS = []
let arVS = []           //active valueSets

let arVS_ret = []       //retired valuesets




arCS.push("### CodeSystems");
//arCS.push("\r\n");
let csText = `
These are code systems that have been defined in this guide. They define specific concepts that are included in ValueSets. It is preferable to use an international code system such as SNOMED, ICD or LOINC - but this is not always possible.

Each CodeSystem resource has a globally unique url that is used to unambiguously identify it. The url generally refers to a description of the codesystem, rather than to the FHIR CodeSystem resource.

The [FHIR spec](http://hl7.org/fhir/terminology-module.html) has much more detail on the use of Terminology in FHIR
`
arCS.push(csText);
arCS.push("<table class='table table-bordered table-condensed'>");
arCS.push("<tr><th>CodeSystem</th><th>Purpose</th><th>CodeSystem Url</th></tr>")


//initial scan to get hash for codesystem urls to the page in the IG
let hashCS = {}
fs.readdirSync(rootPath).forEach(function(file) {
    //console.log(file)
    let ar = file.split('-')
    switch (ar[0]) {
        case 'CodeSystem' :

            let cs = loadFile(file)
            let arCs = file.split('.')
            let csHtmlFile = arCs[0] + '.html'

            hashCS[cs.url] = csHtmlFile
            break;
    }
})


//let ar1 = makeTable(rootPath,'ValueSet',hashCS);    //the sorted table 

let hashVS = {};
let arAuditVS = [];         //all the valueSets - use this to detect duplicates....
let arStructureDefinition = [];     //all the StructureDefinitions - to find unused ValueSets
//now re-read for all terminology files
fs.readdirSync(rootPath).forEach(function(file) {
    //console.log(file)
    let ar = file.split('-')
    switch (ar[0]) {
        case 'StructureDefinition' :
            let ar = file.split('.')
            let link = ar[0] + '.html'
            arStructureDefinition.push({resource:loadFile(file),link:link})
            break;
        case 'ValueSet' :
            let vs = loadFile(file)
           
            addResourceToBundle(bundle,vs)
            hashVS[vs.url] = vs;
            let vsLne = "<tr>"
            vsLne += "<td width='20%'>" + vs.title + "</td>";
            vsLne += "<td>" + vs.description + "</td>";
            //let lne = "| " + vs.title + " | " + vs.description + " | "
            let arVs = file.split('.')
            let htmlFile = arVs[0] + '.html'

            arAuditVS.push({resource:vs,link:htmlFile});        //for the audit routine...

            let vsLink = "<a href='"+ htmlFile +"'>" + vs.url + "</a>";
            vsLne += "<td>" + vsLink + "</td>";

            vsLne += "<td>" 
            vs.compose.include.forEach(function(item) {

                let csHtmlFile = hashCS[item.system];

                if (! csHtmlFile && (item.system.indexOf('http://hl7.org/') > -1 )) {
                    //this is a CS defined in the spec...
                    let ar = item.system.split('/')
                    csHtmlFile = "http://hl7.org/fhir/valueset-" + ar[ar.length - 1] + ".html"
                }


                let csLink = "<a href='"+ csHtmlFile +"'>" + item.system + "</a>";
                if (! csHtmlFile) {
                    //will be undefined if the codesystem is not defined in the IG
                    csLink = item.system;
                } 
                
                vsLne += "<div>" + csLink + "</div>"
            })
            vsLne += "</td>" 


            vsLne += "</tr>"

            //don't include retired VS in the list
            if (vs.status == 'retired') {
                arVS_ret.push(vsLne)
            } else {
                arVS.push(vsLne)
            }
           
            break;

    case 'CodeSystem' :
        let cs = loadFile(file)
        addResourceToBundle(bundle,cs)
        let csLne = "<tr>"
        csLne += "<td width='20%'>" + cs.title + "</td>";
        csLne += "<td>" + cs.description + "</td>";
        //let lne = "| " + vs.title + " | " + vs.description + " | "
        let arCs = file.split('.')
        let csHtmlFile = arCs[0] + '.html'
        let csLink = "<a href='"+ csHtmlFile +"'>" + cs.url + "</a>";
        csLne += "<td>" + csLink + "</td>";
        csLne += "</tr>"
        arCS.push(csLne)
        break;

    }

})
arCS.push("</table>")


arVS.sort();    //sort the contents
arVS_ret.sort();    //sort the retired ValueSets



//---- header for the arVS - active ValueSets
arVSHeader = []
arVSHeader.push("<table class='table table-bordered table-condensed'>");
arVSHeader.push("<tr><th>ValueSet</th><th>Purpose</th><th>Url</th><th>CodeSystem Urls</th></tr>")

let arVS1 = arVSHeader.concat(arVS)

arVS1.splice(0,0,"### ValueSets");
arVS1.push("</table>")
arVS1.push("<br/><br/>")

//at this point arVS1 should have the sorted table with only active VSs in it...



let allVS = arVS1;

if (showRetired && arVS_ret.length > 0) {
    let arVS_ret1 = arVSHeader.concat(arVS_ret)
    arVS_ret1.splice(0,0,"### Retired ValueSets");
    arVS_ret1.push("</table>")
    arVS_ret1.push("<br/><br/>")

    allVS = arVS1.concat(arVS_ret1)  //all the ValueSets - active & retired
}


//at this point arVS_ret1 has the sorted, retired ValueSets

 

let newAR = allVS.concat(arCS)

let fle = newAR.join('\r\n');


//-----------  call the audit functions - duplicate ValueSets (by url)
let dupVSReport = audit.findDuplicateVS(arAuditVS)
if (dupVSReport) {
    console.log("Duplicate ValueSet definitions found")
    fle += "\r\n\r\n### Duplicated ValueSets\r\n\r\n" + dupVSReport
}


//--------- ValueSets defined but not used
//arAuditVS is the list of ValueSets in this IG

let vo = audit.findUnusedVS(arStructureDefinition,arAuditVS)

let unusedVSReport = vo.unusedVS

if (unusedVSReport) {       //return "" if no unused ones...
    fle += unusedVSReport   

}

//------- ValueSets referenced but not in the current IG


fs.writeFileSync(outFile,fle);      //in sushi
fs.writeFileSync(bundleFile,JSON.stringify(bundle));



function loadFile(path) {
    let fullFileName = rootPath + path;
    let contents = fs.readFileSync(fullFileName, {encoding: 'utf8'});
    let resource = JSON.parse(contents)
    return resource;
}

function addResourceToBundle(bundle,resource) {

    if (resource.fhirVersion) {
        resource.fhirVersion = "4.0.0"
    }

    let entry = {resource:resource};
    entry.request = {method:'PUT', url: resource.resourceType + "/" + resource.id}
    bundle.entry.push(entry)
}