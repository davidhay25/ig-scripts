#!/usr/bin/env node
/**
 * make the summary XML file for profiles & extenions
 * makes the pages : input/pagecontent/profiles.xml and input/pagecontent/extensions.xml
 * execute: ./makeProfilesAndExtensions {IG} in the root folder of an IG
 * assumes all SD's are generated by sushi
 * 
 * Need to execute the ./globalScripts/makeGlobalIGSummary after changes to extensions (add / remove) to
 * update the allExt.json and allVS.json files that list the location of all known extensions / term
 *      (so when a profile references an extension defined elsewhere, it knows where it is defined)
 * */

let fs = require('fs');
let igRoot = "/Users/davidhay/IG/";
let markdown = require( "markdown" ).markdown;


//open the file 'allExt.json' containing all extensions defined by all known IGs

let data = fs.readFileSync("../globalScripts/allExt.json").toString();
let hashAllKnownExtensions = JSON.parse(data)
//console.log(hashAllKnownExtensions)

let fmmExtensionUrl = "http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm"

let addFMM = false;      //pass in on the command line
let addStatus = true;

let igName = process.argv[2];   
if (!igName) {
    console.log("No IG specified. Must be in the command eg: ./makeProfilesAndExtensions nhi")
    return;
}

let fullPath = igRoot + igName;

if ( ! fs.existsSync(fullPath)) {
    console.log("The IG '" + igName + "' does not exist (at least, there is no folder with that name.")
    return;
}


let rootPath = igRoot + igName +  "/fsh-generated/resources/";

let profileOutFile1 = igRoot + igName + "/input/pagecontent/profiles.xml";  // for IG publisher
let extOutFile1 = igRoot + igName + "/input/pagecontent/extensions.xml";  // for IG publisher

let bundleFile = igRoot + igName + "/generated/SDs.json"
let bundle = {resourceType:'Bundle',type:'batch',entry:[]}

console.log('Building summary of profiles & extensions for ' + igName)
console.log("IG is located at "+ fullPath);
console.log('Location of StructureDefinitions:' + rootPath)
console.log('Writing profile output to ' + profileOutFile1)
console.log('Writing extension output to ' + extOutFile1)
console.log("Bundle file " + bundleFile)

//all the IGs
//let arAllIgs = ["nzbase","nhi","hpi","northernRegion"]      //all the known IGs


// =========================   defined Profiles   ================

// = "http://build.fhir.org/ig/HL7NZ/";   //where the IGs are

//let onlineBranch = "/branches/main/";     //currently the dev master branch
//let onlineBranch = "/branches/master/";     //currently the dev master branch

let ar = []
ar.push("<div xmlns='http://www.w3.org/1999/xhtml'>")

ar.push("<!-- Generated by the makeProfilesAndExtensions script -->")

ar.push("<br/><strong>Profiles defined in this guide</strong><br/><br/>")
ar.push("<table class='table table-bordered table-hover table-sm'>")
ar.push("<tr><th>Id</th><th>Url</th><th>Description</th></tr>")

let fullFolderPath = rootPath ; //"../" + igName + "/input/profiles";

//---------- Profiles -------------
if (fs.existsSync(fullFolderPath)) {
    let arFiles = fs.readdirSync(fullFolderPath);
    arFiles.forEach(function(name){
        if (name.indexOf("StructureDefinition-") > -1 ) {
            let fullFileName = fullFolderPath + name;

           // console.log(fullFileName)
            let contents = fs.readFileSync(fullFileName).toString();
           
                let profile;
                try {
                    profile = JSON.parse(contents)
                    if (profile.type !== 'Extension' && profile.kind !== 'logical') {
                        ar.push("<tr>")
        
                        let link = "StructureDefinition-" + profile.id + ".html";
                        //let link = onlineServer + igName + onlineBranch + "StructureDefinition-" + profile.id + ".html";
            
console.log(link)

                        ar.push("<td><a href='"+link+"'>" + profile.id + "</a></td>")
                        ar.push("<td>" + profile.url + "</td>")
                        ar.push("<td>" + cleanText(profile.description) + "</td>")
                        ar.push("</tr>")
                        addResourceToBundle(bundle,profile)
                    }
                } catch (ex) {
                    console.log("error reading " + fullFileName)
                }
        }
    })

    ar.push("</table>")
} else {
    console.log("Error: Path " + fullFolderPath + " not found")
}

ar.push("</div>")


let file = ar.join('\r\n')
fs.writeFileSync(profileOutFile1,file);

// ========= defined extensions
let hashExtensions = {} //extensions defined in the guide

ar.length = 0;

ar.push("<div xmlns='http://www.w3.org/1999/xhtml'>")

ar.push("<br/><strong>Extensions defined in this guide</strong><br/><br/>")
ar.push("<table width='100%' border='1' cellspacing='0' cellpadding='5px'>")
ar.push("<tr><th>Id</th><th>Url</th><th>Context of Use</th><th>Description</th><th>Purpose</th>");
if (addFMM) {
    ar.push("<th>FMM</th>")
}

if (addStatus) {
    ar.push("<th>Status</th>")
}

ar.push("</tr>")

// ===== make summary of extensions defined in this guide =====
if (fs.existsSync(fullFolderPath)) {
    let arFiles = fs.readdirSync(fullFolderPath);
    arFiles.forEach(function(name){
        if (name.indexOf("StructureDefinition-") > -1 ) {
            let fullFileName = fullFolderPath + "/"+ name;
            let contents = fs.readFileSync(fullFileName).toString();
            
            let ext =  JSON.parse(contents);
            if (ext.type == 'Extension') {
                addResourceToBundle(bundle,ext)

                let fmm = getExtensionValue(ext,fmmExtensionUrl,'valueInteger') || '0';
//console.log(fmm)
                hashExtensions[ext.url] = true;     //make a note of the extension


                if (addStatus) {
                    if (ext.status == 'active') {
                        ar.push("<tr style='background-color:#FFCCCC'>")
                    } else {
                        ar.push("<tr>")
                    }
                } else {
                    ar.push("<tr>")
                }

               
    
                let link = "StructureDefinition-" + ext.id + ".html";
                // testing... let link = onlineServer + igName + onlineBranch + "StructureDefinition-" + ext.id + ".html";

                ar.push("<td><a href='"+link+"'>" + ext.id + "</a></td>")
                ar.push("<td>" + ext.url + "</td>")
                ar.push("<td>")
                if (ext.context) {
                    ext.context.forEach(function(ctx){
                        ar.push("<div>" + ctx.expression + "</div>")
                    })
                }
                ar.push("</td>")
    
                ar.push("<td>" + cleanText(ext.description) + "</td>")
                if (ext.purpose) {
                    ar.push("<td>" + cleanText(ext.purpose) + "</td>")
                } else {
                    ar.push("<td></td>")
                }
               
                if (addFMM) {
                    ar.push("<td>" + fmm + "</td>")
                }
                if (addStatus) {
                    ar.push("<td>" + ext.status + "</td>")
                }

                ar.push("</tr>")
            }

        }
    })

    ar.push("</table>")
}

//  ========== external extensions referred to by this guide =========
//let arFolder = ["nzbase","nhi","hpi","northernRegion"]      //all the known IGs


// first, load all the extensions in all the IGs. This will allow us to know where the IG was defined...
//let hashEveryIG = {}
///arFolder.forEach(function(folder){
    //let fullFolderPath = "../" + folder + "/input/profiles";



//the file ../global   
/*  today

let hashAllExt = {};        //all extensions in all IGs
arAllIgs.forEach(function(folder){
    let fullFolderPath = "../" + folder + "/input/extensions";
    if (fs.existsSync(fullFolderPath)) {
        let arFiles = fs.readdirSync(fullFolderPath);
        arFiles.forEach(function(name){
            if (name.indexOf(".json") > -1 ) {
                let fullFileName = fullFolderPath + "/"+ name;
                let contents = fs.readFileSync(fullFileName).toString();
                let profile = JSON.parse(contents)
                hashAllExt[profile.url] = {extension:profile,ig:folder};
            }
        })
    }
})

*/


    //console.log('extensions used but defined externally')


ar.push('<a name="externalExtensions"> </a>')   
ar.push("<h3>Extensions used but defined elsewhere</h3>")
ar.push("<table width='100%' border='1' cellspacing='0' cellpadding='5px'>")
ar.push("<tr><th>Path</th><th>Url</th><th>Description</th><th>IG where defined</th></tr>")


//look through all the profiles in the IG, and pull out the references to extensions.
//compare to  hashExtensions. if present, then this extension is defined in theIG
// if not, then see if in hashAllKnownExtensions


let arFiles = fs.readdirSync(rootPath);
arFiles.forEach(function(name){
    
    if (name.indexOf("StructureDefinition-") > -1) {
        //this is a StructureDefinition
        let fullFileName = fullFolderPath + "/"+ name;
        let contents = fs.readFileSync(fullFileName).toString();
        let SD = JSON.parse(contents)

        if (SD.type !== 'Extension') {
            //this is a profile - look for references to an extension.
            //assume that there is a differential that has these - ? may need to use snapshot
            SD.differential.element.forEach(function(ed){
                if (ed.type) {
                    ed.type.forEach(function(typ){
                        if (typ.code == 'Extension' && typ.profile) {
                            typ.profile.forEach(function(prof){
                                //console.log(prof)
                                if (! hashExtensions[prof]) {
                                    //the extension url is not in the list of those defined by this IG

                                    let arItem = hashAllKnownExtensions[prof];    //[{IG: description: location:}
                                    if (arItem) {
                                        //These is an entry in the 'all Extensions for all IGs list...
                                        // it is an array of {IG: description: }

                                        //console.log("---> external (but in IGs)", extDef.extension.description)

                                        ar.push("<tr>")

                                        let path = ed.path.replace('.extension','')
                                        ar.push("<td>" + path + "</td>")
                                        ar.push("<td>" + prof + "</td>")
                                        //ar.push("<td><a href='"+link+"'>" + prof + "</a></td>")
                                        ar.push("<td>" + cleanText(arItem[0].description) + "</td>")

                                        ar.push("<td>")
                                        arItem.forEach(function(item){
                                            ar.push("<div><a href='"+ item.location +"'>" + item.IG.name + "</a></div>")
                                        })
                                     
                                        ar.push("</td>")

                                        ar.push("</tr>")
                                    } else {
                                        //console.log("---> external")

                                        ar.push("<tr>")
                                        ar.push("<td>" + ed.path + "</td>")
                                        ar.push("<td>" + prof + "</td>")
                                        ar.push("<td>Defined outside of known IG's</td>")
                                        ar.push("</tr>")
                                    }
                                    

                                }  else {
                                    //console.log('Defined in IG')
                                }                                       
                            })
                        }
                    })
                }
            })
    }
}

})

ar.push("</table>")



ar.push("</div>")


let file1 = ar.join('\r\n')
//fs.writeFileSync(extOutFile,file1);
fs.writeFileSync(extOutFile1,file1);

fs.writeFileSync(bundleFile,JSON.stringify(bundle));


// get value of an extension valueType = 'valueInteger' or similarrr
function getExtensionValue(resource,url,valueType) {
    let result = ""
    if (resource.extension) {
        resource.extension.forEach(function(ext){
            if (ext.url = url) {
                //console.log(ext,valueType)
                result = ext[valueType]
            }
        })
    }
    return result
}


//ensure that characters that can update XML are 'escpaed'
function cleanText(s) {
    //replace all instances of '& ' with 'and '
    if (s) {

        //a hack for the ethnicity extension in nzbase - the url is too long and mucks up the table spacing
       // s = s.split('=http').join('= http')



        let s1 = s.split('& ').join('and ')
        return markdown.toHTML(s1)
        //return s1
    } else {
        return s
    }
}


function addResourceToBundle(bundle,resource) {

    if (resource.fhirVersion) {
        resource.fhirVersion = "4.0.0"
    }

    let entry = {resource:resource};
    entry.request = {method:'PUT', url: resource.resourceType + "/" + resource.id}
    bundle.entry.push(entry)
}