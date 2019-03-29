xquery version "3.1";

declare namespace output = "http://www.w3.org/2010/xslt-xquery-serialization";
declare option output:method "json";
declare option output:media-type "application/json";

declare variable $local:file := '/db/apps/ecpo/data/image-list.xml';

declare variable $local:base-url := 'http://kjc-sv010.kjc.uni-heidelberg.de:8080/fcgi-bin/iipsrv.fcgi?IIIF=imageStorage/ecpo_new';
declare variable $local:suffix := 'full/!4096,4096/0/default.jpg';

declare function local:get-annotation-info ($document-id) {
    let $groups := collection('/db/apps/wap-data')/annotation[$document-id = ./target/@source/string()][./body/group]
    let $shapes := collection('/db/apps/wap-data')/annotation[$document-id = ./target/@source/string()][not(./body/group)]

    let $dates := 
        for $created in $shapes/@created/string()
        let $date := xs:dateTime($created)
        order by $date descending
        return $date

    return map {
        'shapes': count($shapes),
        'groups': count($groups),
        'lastCreated': $dates[1]
    }
};

declare function local:document-to-map ($file, $base-collection) {
    let $year := $file/@year/string()
    let $month := $file/@month/string()
    let $name := $file/@name/string()
    let $day := $file/@day/string()
    let $date := xs:date(string-join(($year, $month, $day), '-'))

    let $document-url := (
        $local:base-url,
        $base-collection,
        $year,
        $month,
        replace($name, '\+', '%252B'),
        $local:suffix
    )
    => string-join('/')

    let $annotationInfo := local:get-annotation-info($document-url)    

    return map {
        'annotationsCount': $annotationInfo?shapes,
        'groupsCount': $annotationInfo?groups,
        'lastModified': $annotationInfo?lastCreated,
        'name': $name,
        'date': $date,
        'id': $document-url
    }
};

let $root := doc($local:file)/base
let $mapping-function := local:document-to-map(?, $root/@name/string())

(:~ TODO filter based on year, month, permissions, etc ... ~:)
(:~ TODO paged results ~:)
let $files := $root//file

return map {
    'images': array {
        for-each($files, $mapping-function(?))
    }
}
