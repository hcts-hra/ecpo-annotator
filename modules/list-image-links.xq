xquery version "3.1";

declare namespace output = "http://www.w3.org/2010/xslt-xquery-serialization";
declare option output:method "json";
declare option output:media-type "application/json";

declare function local:build-link-to ($file, $base, $suffix) {
    let $year := $file/@year/string()
    let $month := $file/@month/string()
    let $name := $file/@name/string()
    let $day := $file/@day/string()
    let $date := xs:date(string-join(($year, $month, $day), '-'))

    let $parts := (
        $base,
        $year,
        $month,
        replace($name, '\+', '%252B'),
        $suffix
    )

    return map {
        'name': $name,
        'date': $date,
        'id': string-join($parts, '/')
    }
};

let $root := doc('/db/apps/ecpo/data/image-list.xml')/base
let $base := 'http://kjc-sv010.kjc.uni-heidelberg.de:8080/fcgi-bin/iipsrv.fcgi?IIIF=imageStorage/ecpo_new/' || $root/@name/string()
let $suffix := 'full/!4096,4096/0/default.jpg'

(:~ TODO filter based on year, month, permissions, etc ... ~:)
let $files := $root//file

return map {
    'images': array {
        for-each($files, local:build-link-to(?, $base, $suffix))
    }
}
