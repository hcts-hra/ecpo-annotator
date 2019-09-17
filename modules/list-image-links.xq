xquery version "3.1";

declare namespace output = "http://www.w3.org/2010/xslt-xquery-serialization";
declare option output:method "json";
declare option output:media-type "application/json";

declare variable $local:file := '/db/apps/ecpo/data/image-list.xml';

declare variable $local:base-url := 'http://kjc-sv002.kjc.uni-heidelberg.de:8080/fcgi-bin/iipsrv.fcgi?IIIF=imageStorage/ecpo_new';
declare variable $local:suffix := 'full/full/0/default.jpg';
declare variable $local:all-sources := collection('/db/apps/wap-data');

declare function local:get-annotation-info ($document-id) {
    let $referenced := $local:all-sources//target/@source[.=$document-id]/../..
    let $groups := $referenced[./body/group]
    let $shapes := $referenced[not(./body/group)]

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
let $page := xs:integer(request:get-parameter('page', 1))
let $year := request:get-parameter('year', ())
let $month := request:get-parameter('month', ())

let $all := $root//file
let $total := count($all)

let $files := $all/@year[.=$year]/../@month[.=$month]/..
(:~
let $lower := ($page - 1) * 50 + 1
let $files := subsequence($all, $lower, 50)
~:)

let $years := 
    for $year in $root//file/@year/string()
    group by $year
    order by $year ascending
    return $year

return map {
    (:~ 'page': $page, ~:)
    (:~ 'lastPage': $total div 50, ~:)
    'total': $total,
    'years': $years,
    'images': array {
        for-each($files, $mapping-function(?))
    }
}
