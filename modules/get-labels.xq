xquery version "3.1";

declare namespace output="http://www.w3.org/2010/xslt-xquery-serialization";
declare option output:method "json";
declare option output:media-type "application/json";

let $labels := doc('/db/apps/ecpo/data/config.xml')//label

for $label in $labels
    let $name := data($label/@name)
    let $text := data($label)
    let $color := data($label/@color)
    return
        map{
            "name": $name,
            "label": $text,
            "color": $color
            }
