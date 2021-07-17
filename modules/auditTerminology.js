//locate ValueSets with no reference from any profile or extension
let findUnusedVS = function(allSD,allVS) {
    //console.log('unised')
    console.log('count of SD: ' + allSD.length)

    //first, a hash of all the VS (ignore dups - last one wins)
    let hash = {}
    let arMissingBindings = []  //a binding where the VS was not found in this IG

    allVS.forEach(function (item) {
        hash[item.resource.url] = {used:false,link:item.link}
    })

    //now go through the snapshots of all SD's looking for bindings
    allSD.forEach(function (item) {
        let SD = item.resource;
        //console.log(SD.url + "  " + SD.snapshot.element.length)
        if (SD.snapshot && SD.snapshot.element) {
            SD.snapshot.element.forEach(function (ed) {
                //console.log(ed.binding)
                if (ed.binding && ed.binding.valueSet) {
                    //console.log(ed.path + " " + ed.binding.valueSet)
                    if (hash[ed.binding.valueSet]) {
                        //ValueSet has been referenced
                        //console.log('Binding to ' + ed.binding.valueSet + ' in ' + SD.url)
                        hash[ed.binding.valueSet].used = true
                    } else {
                        //A binding to a ValueSet not defined in this IG
                        //could be from an extension of profile... 
                        arMissingBindings.push({path:ed.path,binding:ed.binding})
                    }
                }
                
            })
        }
    })

    //console.log(hash)

    // ================= now do all the audit reports
    let result = "";        //all the reports


    let arReportUnusedVS = []

    //look for unused ValueSets
    Object.keys(hash).forEach(function (key) {
        if (! hash[key].used) {
            //no binding for this Valueset
            console.log('not bound: ' + key)
            let lne = '<tr>'

            let lnk = "<a href='"+ hash[key].link +"'>" + key + "</a>";

            lne += "<td>" + lnk + "</td>"
            lne += "</tr>"
            arReportUnusedVS.push(lne)
        }
    })
    // and generate the report
    if (arReportUnusedVS.length > 0) {
        arReportUnusedVS.sort()
        let header = "\r\n\r\n### ValueSets defined but not used\r\n\r\n"
        header += "<table><tr><th>Url</th></tr>"
        arReportUnusedVS.splice(0,0,header)
        arReportUnusedVS.push("</table>")
        //console.log(arReportUnusedVS)

        result +=  arReportUnusedVS.join('\r\n')
    }

    //now for bindings to ValueSets not defined in this guide
    if (arMissingBindings.length > 0) {
        
        let report = "\r\n\r\n### Bindings to ValueSets not defined in this guide\r\n\r\n"
        report += "<table><tr><th>Binding</th><th>Url</th></tr>"


    }

    return ({unusedVS:result})

}


//let findExternally

//locate all duplicate CodeCostems (by url)
let findDuplicateCS = function(allCS) {

}


//locate all the duplicate ValueSets, returning a sorted table
let findDuplicateVS = function(allVS) {
    return findDuplicates(allVS,'ValueSet')
}

function findDuplicates(ar) {
    let hash = {}
    ar.forEach(item => {
        let vs = item.resource;
        if (hash[vs.url]) {
            hash[vs.url].push(item)
        } else {
            hash[vs.url] = [item]
        }
    });

    let arReport = [];      //will be the list of duplicated
    //let duplicatesFound = false;
    Object.keys(hash).forEach(function (key) {
        let v = hash[key]
        if (v.length > 1) {
            //this is a duplicate
            duplicatesFound = true;
            let lne = "<tr>";
            let htmlFile = v[0].link
            let lnk = "<a href='"+ htmlFile +"'>" + v[0].resource.url + "</a>";
            lne += "<td>" + lnk + "</td>";
            lne += "</tr>"
            arReport.push(lne)


           // console.log(key)
        }
        

    })
    if (arReport.length > 0) {
        arReport.sort()
        let header = "<table><tr><th>Url</th></tr>"
        arReport.splice(0,0,header)
        arReport.push("</table>")
        //console.log(arReport)
        return arReport.join('\r\n')
    }

}

module.exports = { findUnusedVS,findDuplicateVS }