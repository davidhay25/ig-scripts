#!/usr/bin/env node
/**
 * Audit the terminology in the IG with a terminology server
 * Overall strategy:


*     Process

*       execute ./scripts/uploadTerminology - will upload all term resources to  the server
        scan through the /fsh-generated/resources/ folder
        for each VS in the IG 
            perform an expansion of the same url on the term server
            create a 'diff' page comparing with the IG version (like a spreadsheet - rows = concepts) 
            save as html page. publish in IG as audit page

 * */


 let fs = require('fs');
 let igRoot = "/Users/davidhay/IG/";
 let axios = require('axios')
 //let arReport = []

 let igName = process.argv[2];   
 if (!igName) {
     console.log("No IG specified. Must be in the command eg: ./auditTerminology.js nhi")
     return;
 }
 
 let fullPath = igRoot + igName;
 
 if ( ! fs.existsSync(fullPath)) {
     console.log("The IG '" + igName + "' does not exist (at least, there is no folder with that name.")
     return;
 }
 
 //the server used to hold term. resources from the IG. These can be uploaded by ./uploadTerminology
 //let igServer = "http://home.clinfhir.com:8054/baseR4/"
 let igServer = "https://r4.ontoserver.csiro.au/fhir/"
 //the NZ reference server
 let termnz = "https://terminz.azurewebsites.net/fhir/"

 let rootPath = igRoot + igName +  "/fsh-generated/resources/";

 let outFile = igRoot + igName + "/input/pagecontent/termaudit.md"
 
 console.log('Auditing terminology for ' + igName)
 console.log("IG is located at "+ fullPath);
 console.log('Location of terminology:' + rootPath)
 console.log('Writing report to ' + outFile)



// ---- check all ValueSets
 //upload all the Codesystems and Valuesets first
 arPromises = []
 arFileNames = {}       //hash of filename by url
 let hashEachVSReportSegment = {}          //each VS has a separate segment in the report
 let hashEachVSDescription = {}             //holds the description of the IG from each server

 fs.readdirSync(rootPath).forEach(function(file) {
    //console.log(file)
    let ar = file.split('-')
    let resource = loadFile(file)
    let id = resource.id
    let canonicalUrl = resource.url;
    //let url = igServer + resource.resourceType + "/" + id
    hashEachVSDescription[canonicalUrl] = {ig:resource.description,termnz:""}

    switch (ar[0]) {
        case 'ValueSet' :
            arFileNames[canonicalUrl] = file.replace('.json','.html')
            console.log(canonicalUrl)
            arPromises.push(checkVS(canonicalUrl,id))
    }
})

console.log(arPromises.length)

Promise.all(arPromises).then(function(){
    console.log('at end')

    let arReport = []
    Object.keys(hashEachVSReportSegment).forEach(function (url) {
        let ar = url.split('/')
        arReport.push("\n#### " + ar[ar.length-1]);

        let link = "<div><a href='" + arFileNames[url] + "'>" + url + "</a></div>"
        //arReport.push(`<div><a href=${arFileNames[url]}>${url}</a></div>`)
        arReport.push(link)

        //add the table with descriptions
        arReport.push("<table class='table table-bordered'>")
        arReport.push("<tr><th>Description from IG</th><th>Description from Terminz</th></tr>")
        arReport.push("<tr>")
        arReport.push("<td width='50%'>" + hashEachVSDescription[url].ig + "</td>")
        arReport.push("<td>" + hashEachVSDescription[url].termnz + "</td>")
        arReport.push("</tr>")


        arReport.push("</table>")
        arReport = arReport.concat(hashEachVSReportSegment[url])
    
    })
    //console.log(arReport)
    let contents = arReport.join('\r\n\r\n');
    fs.writeFileSync(outFile,contents)
    console.log("Audit report written to " + outFile)

})


return
   


function checkVS(canonicalUrl,id) {
    return new Promise(resolve => {
        hashEachVSReportSegment[canonicalUrl] = []  //this will be the report for this VS

            let igQry = igServer + "/ValueSet/$expand?url=" + canonicalUrl;// + "&incldueDefinition=true"
            
            axios.get(igQry).then(
                function(response) {
                    let igVS = response.data;
                    hashEachVSReportSegment[canonicalUrl].push(`Found in IG server. ${igVS.expansion.total} concepts.`)
                    //description not returned in expansion by ontoserver
                    //hashEachVSDescription[canonicalUrl] = {ig: igVS.description}

                    console.log('IG: number of expansions ' + igVS.expansion.total)

                    // now check in termnz
                    //let termnzUrl = hashHack[canonicalUrl]
                    //change to assume irl is "https://terminz.azurewebsites.net/fhir/ValueSet/" plus the id
                    //let ar = canonicalUrl.split('/')

                    //now the same url...
                    let termnzUrl = canonicalUrl;


                    //let termnzUrl = "https://terminz.azurewebsites.net/fhir/ValueSet/" + ar[ar.length-1]


                    if (!termnzUrl) {
                        hashEachVSReportSegment[canonicalUrl].push('Mapping to terminz url not available. Unable to check.')
                        resolve()
                        return;
                    }
                    let termnzQry = termnz + "/ValueSet/$expand?url=" + termnzUrl

                    axios.get(termnzQry).then(
                        function(response) {
                            let termnzVS = response.data;
                            let lne = `Found in Terminz. ${termnzVS.expansion.total} concepts. (Using url: ${termnzUrl})`

                            hashEachVSReportSegment[canonicalUrl].push(lne)
                            hashEachVSDescription[canonicalUrl].termnz = termnzVS.description || "No description found"
                           // hashEachVSReportSegment[canonicalUrl].push(`Using url: ${termnzUrl}`)
                            console.log('Terminz: number of expansions ' + termnzVS.expansion.total)

                            //hashEachVSReportSegment[canonicalUrl].push("-------> can do diff")
                            
                            try {
                                processResultsOneVS(igVS,termnzVS,hashEachVSReportSegment[canonicalUrl])
                            } catch(ex) {
                                console.log('===============> error =====>',ex)
                            }
                           
                            resolve()
                        }
                        ).catch(function(ex){
                            //this is an error accessing termnz
                            hashEachVSReportSegment[canonicalUrl].push('Error expanding on Terminz')
                            addOO(ex.response.data,hashEachVSReportSegment[canonicalUrl])

                            resolve()
                        })

                }
            ).catch(function(ex) {
                //this is an error accessing the IG server
                //console.log(ex.response.data)
                hashEachVSReportSegment[canonicalUrl].push('Error expanding on IG server')
                addOO(ex.response.data,hashEachVSReportSegment[canonicalUrl])
                resolve()
            })
    
    })

    function addOO(oo,ar) {
        if (oo.resourceType == 'OperationOutcome' && oo.issue.length > 0) {
            oo.issue.forEach(function (iss) {
                ar.push(iss.diagnostics)
                
            })
        }

    }
}


//create the gap between 2 expanded vs
function processResultsOneVS(igVS,termnzVS,arReport) {
    console.log('processing...')
    let hash = {}
    let source1 = "ig"
    let source2 = "termnz"
    updateConceptHash(hash,igVS,source1)
    updateConceptHash(hash,termnzVS,source2)

    //console.log(igVS.url)
    //console.log(hash)

    let onlyIn = {ig:[],termnz:[]}      //lists the concepts that are only in one of the Valuesets
    let diffCount = 0;
    //console.log(hash)
    //Now can look for any differences
    Object.keys(hash).forEach(function(key){        //key is system|code
        let codeItem = hash[key]


        if (codeItem[source1] && codeItem[source2]){
            //the concept is in both - a good thing, but not of interest to us...
            //console.log(key + " in both!")
        } else {
            if (codeItem[source1]) {
                //it's in the first source
                //onlyIn[source1].push(`The concept ${key} is only in ${source1}`  )
                onlyIn[source1].push(` ${key}  ${codeItem.display}`  )
                //console.log(codeItem.display)
                diffCount++
            } else {
                //must be the second
                onlyIn[source2].push(` ${key}  ${codeItem.display}`  )
                //onlyIn[source1].push(`The concept ${key} is only in ${source2}`  )
                diffCount++
                //console.log(codeItem.display)
            }
        }

    })
    //now we can assemble the report for this concept

    if (diffCount == 0) {
        arReport.push("The contents of the valueSets are the same. Hurrah! (comparing system & code)")
    } else {
        addToReport(source1,onlyIn[source1],arReport)
        addToReport(source2,onlyIn[source2],arReport)
    }

    function addToReport(source,arDiff,arReport) {
        if (arDiff.length > 0) {
            arReport.push(`<strong>Concepts only found in ${source}</strong>`)
            arReport.push('<ul>')
            arDiff.forEach(function (lne) {
                arReport.push(`<li>${lne}</li>`)
            })
            arReport.push('</ul>')
        }
    }

}

function updateConceptHash(hash,vs,source) {
    //let ar = []
    if (vs.expansion && vs.expansion.contains) {
        vs.expansion.contains.forEach(function(concept) {
            let key = concept.system + "|" + concept.code
            hash[key] = hash[key] || {}
            let item = hash[key]
            item[source] = true
            if (! concept.display) {
                item.display = concept.display
            }
            
           // console.log(concept.display)
    
        })
    }
    
}

function loadFile(path) {
    let fullFileName = rootPath + path;
    let contents = fs.readFileSync(fullFileName, {encoding: 'utf8'});
    let resource = JSON.parse(contents)
    return resource;
}

