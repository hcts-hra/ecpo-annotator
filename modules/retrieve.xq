xquery version "3.1";

import module namespace http="http://expath.org/ns/http-client";

declare variable $local:collection := '/db/apps/wap-data/';

declare function local:update($res) {
    not(doc-available($local:collection || $res/@name/string())) or
    (
        xmldb:last-modified($local:collection, $res/@name/string()) <
        xs:dateTime($res/@last-modified/string())
    )
};

declare function local:check($server, $res) {
    let $name := $res/@name/string()
    return
    if (local:update($res))
    then (
        let $request :=
            <http:request method="GET" 
                href="{$server}/{$name}"
                timeout="30">
                <http:header name="accept" value="application/xml"/>
            </http:request>
    
        let $response := http:send-request($request)
    
        return (
            ('store:', $name),
            xmldb:store($local:collection, $name, $response[2])
        )
    )
    else (
        ('found:', $res)
    )
};

let $server := "http://ecpo.existsolutions.com/exist/apps/wap-data"

let $request :=
    <http:request method="GET" href="{$server}" timeout="30">
        <http:header name="accept" value="application/xml"/>
    </http:request>

let $response := http:send-request($request)

return array { for-each($response[2]//exist:resource, local:check(?, $server)) }