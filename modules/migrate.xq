xquery version "3.1";
(:
 : migrate to new IIIF server address
 :)

let $collection := '/db/apps/wap-data'
let $to-migrate := collection($collection)//target/@source[contains(., "http://kjc-sv010")]/../..

return
element result {
    for $old-source in $to-migrate/target/@source
    let $new-source := replace($old-source/string(), "http://kjc-sv010", "https://kjc-sv002")
    let $document-name := util:document-name($old-source)
    let $last-modified := xmldb:last-modified($collection, $document-name)

    return (
        update value $old-source with $new-source,
        xmldb:touch($collection, $document-name, $last-modified),
        element replace {
            attribute new-source { $new-source },
            attribute document-name { $document-name },
            attribute last-modified { $last-modified },
            $old-source
        }
    )
}

