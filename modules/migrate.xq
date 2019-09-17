xquery version "3.1";
(:
 : migrate to new IIIF server address
 :)

let $to-migrate := collection('/db/apps/wap-data')//target/@source[contains(., "kjc-sv010")]/../..

return
element result {
    for $old-source in $to-migrate/target/@source
    let $new-source := replace($old-source/string(), "kjc-sv010", "kjc-sv002")

    return (
        update value $old-source with $new-source,
        element replace {
            attribute with { $new-source },
            $old-source
        }
    )
}

