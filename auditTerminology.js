#!/usr/bin/env node
/**
 * Audit the terminology in the IG with a terminology server
 * Overall strategy:
 *    Phase 1 - prepare  (run as a separate script as only needs to be executed when term. changes in the IG)
 *      copy CodeSystems / ValueSets to my hapi server
 *      'uploadTerminology.js'
*     Phase 2 - execute
        for each VS in the IG
            perform an expansion of the same url on the term server
            create a 'diff' page comparing with the IG version (like a spreadsheet - rows = concepts) 
            save as html page. ? publish in IG as audit page

 * */


//temporary hash for fix termnz urls
 let hashHack = {}  
 hashHack['https://standards.digital.health.nz/fhir/ValueSet/nz-citizenship-status-code'] = "https://terminz.azurewebsites.net/fhir/ValueSet/nz-citizenship-status-code"
 hashHack['https://standards.digital.health.nz/fhir/ValueSet/dhb-code'] = "https://terminz.azurewebsites.net/fhir/ValueSet/dhb-code"
 hashHack['https://standards.digital.health.nz/fhir/ValueSet/ethnic-group-level-4-code'] = "https://terminz.azurewebsites.net/fhir/ValueSet/ethnic-group-level-4-code"
 hashHack['https://standards.digital.health.nz/fhir/ValueSet/funded-programme-code'] = "https://terminz.azurewebsites.net/fhir/ValueSet/funded-programme-code"
 hashHack['https://standards.digital.health.nz/fhir/ValueSet/information-source-code'] = "https://terminz.azurewebsites.net/fhir/ValueSet/information-source-code"
 hashHack['https://standards.digital.health.nz/fhir/ValueSet/nz-residency-status-code'] = "https://terminz.azurewebsites.net/fhir/ValueSet/nz-residency-status-code"
 hashHack['https://standards.digital.health.nz/fhir/ValueSet/pho-code'] = "https://terminz.azurewebsites.net/fhir/ValueSet/pho-code"
 hashHack['https://standards.digital.health.nz/fhir/ValueSet/practitioner-registration-status-code'] = "https://terminz.azurewebsites.net/fhir/ValueSet/practitioner-registration-status-code"
 hashHack['https://standards.digital.health.nz/fhir/ValueSet/practitioner-scope-of-practice-code'] = "https://terminz.azurewebsites.net/fhir/ValueSet/practitioner-scope-of-practice-code"
 hashHack['https://standards.digital.health.nz/fhir/ValueSet/domicile-code'] = "https://terminz.azurewebsites.net/fhir/ValueSet/domicile-code"



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
 
 //the server used to hold term. resources from the IG
 let igServer = "http://home.clinfhir.com:8054/baseR4/"
 //let igServer = "http://hapi.fhir.org/baseR4/"
 //the NZ reference server
 let termnz = "https://terminz.azurewebsites.net/fhir/"

 let rootPath = igRoot + igName +  "/fsh-generated/resources/";

 //let outFile = igRoot + igName + "/generated/auditTerminology.json"
 let outFile = igRoot + igName + "/input/pagecontent/immaudit.md"
 
 console.log('Auditing terminology for ' + igName)
 console.log("IG is located at "+ fullPath);
 console.log('Location of terminology:' + rootPath)
 console.log('Writing report to ' + outFile)



// ---- check all ValueSets
 //upload all the Codesystems and Valuesets first
 arPromises = []
 hashEachVSReportSegment = {}          //each VS has a separate 
 fs.readdirSync(rootPath).forEach(function(file) {
    //console.log(file)
    let ar = file.split('-')
    let resource = loadFile(file)
    let id = resource.id
    let canonicalUrl = resource.url;
    //let url = igServer + resource.resourceType + "/" + id

    switch (ar[0]) {
        case 'ValueSet' :
            console.log(canonicalUrl)
            arPromises.push(checkVS(canonicalUrl,id))
        
    }
})

console.log(arPromises.length)

Promise.all(arPromises).then(function(){
    console.log('at end')

    let arReport = []
    Object.keys(hashEachVSReportSegment).forEach(function (url) {
    arReport.push("### " + url);

    arReport = arReport.concat(hashEachVSReportSegment[url])
    
    })
    console.log(arReport)
    let contents = arReport.join('\r\n\r\n');

    fs.writeFileSync(outFile,contents)

})


return
   
//let arReport = []
Object.keys(hashEachVSReportSegment).forEach(function (url) {
    arReport.push("### " + url);
    arReport = arReport.concat(hashEachVSReportSegment[url])
    
})

//console.log(arReport)

//eturn
//console.log(arPromises)



function checkVS(canonicalUrl,id) {
    return new Promise(resolve => {
        hashEachVSReportSegment[canonicalUrl] = []  //this will be the report for this VS

            let igQry = igServer + "/ValueSet/$expand?url=" + canonicalUrl
            
            axios.get(igQry).then(
                function(response) {
                    let igVS = response.data;
                    hashEachVSReportSegment[canonicalUrl].push(`Found in IG server. ${igVS.expansion.total} concepts.`)
                   
                    console.log('IG: number of expansions ' + igVS.expansion.total)

                    // now check in termnz
                    let termnzUrl = hashHack[canonicalUrl]
                    if (!termnzUrl) {
                        hashEachVSReportSegment[canonicalUrl].push('Not in hashHack')
                        resolve()
                        return;
                    }
                    let termnzQry = termnz + "/ValueSet/$expand?url=" + termnzUrl

                    axios.get(termnzQry).then(
                        function(response) {
                            let termnzVS = response.data;
                            hashEachVSReportSegment[canonicalUrl].push(`Found in Termnz. ${termnzVS.expansion.total} concepts.`)
                            hashEachVSReportSegment[canonicalUrl].push(`Using url: ${termnzUrl}`)
                            console.log('Termnz: number of expansions ' + termnzVS.expansion.total)

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
                            hashEachVSReportSegment[canonicalUrl].push('Error expanding on Termnz')
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

    let onlyIn = {ig:[],termnz:[]}      //lists the concepts that are only in one of the Valuesets
    let diffCount = 0;
    //console.log(hash)
    //Now can look for ant differences
    Object.keys(hash).forEach(function(key){        //key is system|code
        let codeItem = hash[key]
        if (codeItem[source1] && codeItem[source2]){
            //the concept is in both - a good thing, but not of interest to us...
            //console.log(key + " in both!")
        } else {
            if (codeItem[source1]) {
                //it's in the first source
                onlyIn[source1].push(`The concept ${key} is only in ${source1}`  )
                diffCount++
            } else {
                //must be the second
                onlyIn[source1].push(`The concept ${key} is only in ${source2}`  )
                diffCount++
            }
        }

    })
    //now we can assemble the report for this concept


    if (diffCount == 0) {
        arReport.push("The contents of the valueSets are the same (comparing system & code)")
    } else {
        addToReport(source1,onlyIn[source1],arReport)
        addToReport(source2,onlyIn[source2],arReport)
    }

    
    
    function addToReport(source,arDiff,arReport) {
        if (arDiff.length > 0) {
            arDiff.forEach(function (lne) {
                arReport.push(lne)
            })
        }
    }

}

function updateConceptHash(hash,vs,source) {
    let ar = []
    if (vs.expansion && vs.expansion.contains) {
        vs.expansion.contains.forEach(function(concept) {
            let key = concept.system + "|" + concept.code
            hash[key] = hash[key] || {}
            let item = hash[key]
            item[source] = true
    
        })
    }
    
}



 
function loadFile(path) {
    let fullFileName = rootPath + path;
    let contents = fs.readFileSync(fullFileName, {encoding: 'utf8'});
    let resource = JSON.parse(contents)
    return resource;
}


// ================== old stuff

//outFile

let processVSDEP = function (url,id) {

    return new Promise(resolve => {

        arReport.push("### " + url);


        let vo = getVSFromServer()

        

/*
        let resourceFromIGServer = await getVSbyUrl(igServer,url)
        console.log('ref',resourceFromIGServer.outcome)


        //to correct an issue with termnz
        let termnzUrl = "https://terminz.azurewebsites.net/fhir/ValueSet/"+ id

        let resourceFromTermnz = await getVSbyUrl(termnz,termnzUrl)

*/

        //console.log('termnz',resourceFromTermnz.outcome)
        if (vo.ig && vo.ig.outcome && vo.termnz && vo.termnz.outcome) {
        //if (resourceFromIGServer.outcome && resourceFromTermnz.outcome) {
            //have both VSs - can now perfrom diff on expansions

            console.log(resourceFromIGServer.data.resourceType)

            arReport.push("<table class='table table-bordered table-condensed'>");
            arReport.push("<tr><th>CodeSystem</th><th>Purpose</th><th>CodeSystem Url</th></tr>")


            arReport.push("</table");

        } else {
            if (! vo.termnz || ! vo.termnz.outcome) {
                arReport.push("<div><strong>ValueSet with this url not found on Terminz server</strong></div>")
            }
            if (! vo.ig || ! vo.ig.outcome) {
                arReport.push("<div><strong>ValueSet with this url not found on IG server</strong></div>")
            }



        }

        resolve()

        async function getVSFromServer(){
            let resourceFromIGServer = await getVSbyUrl(igServer,url)
            console.log('ref',resourceFromIGServer.outcome)


            //to correct an issue with termnz
            let termnzUrl = "https://terminz.azurewebsites.net/fhir/ValueSet/"+ id

            let resourceFromTermnz = await getVSbyUrl(termnz,termnzUrl)
            return ({ig:resourceFromIGServer,termnz:resourceFromTermnz})
        }

    })
}



async function getVSbyUrlDEP(server,url) {
    return new Promise(resolve => {
        let qry = server + "ValueSet/$expand?url=" + url
        //console.log('qry: '+qry)
      
        axios.get(qry).then(
            function(response) {

                //console.log(response)
                let resource = response.data 
                resolve({outcome:true,data: resource})
/*
                if (resource.resourceType !== 'Bundle') {
                    resolve({outcome:false})
                } else {
                    if (resource.entry) {
                        if (resource.entry.length == 1) {
                            



                            resolve({outcome:true,data: resource.entry[0].resource })

                        } else {
                            resolve({outcome:false,data:"Bundle has " + resource.entry.length + " matching entries"})
                        }

                    } else {
                        resolve({outcome:false,data:"No entry in Bundle"})
                    }



                    
                }
                */
            }
        ).catch(function(ex) {

            //console.log('ex: ',ex.response.data)
            resolve({outcome:false,data:ex.response.data})
        })

    })


    

}
