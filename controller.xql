xquery version "3.1";

import module namespace login="http://exist-db.org/xquery/login"
    at "resource:org/exist/xquery/modules/persistentlogin/login.xql";

declare variable $exist:path external;
declare variable $exist:resource external;
declare variable $exist:controller external;
declare variable $exist:prefix external;
declare variable $exist:root external;
declare variable $exist:context external;

declare variable $local:login-domain := "org.exist.login";
declare function local:user-allowed ($user) as xs:boolean {
    not(empty($user)) and $user ne "guest"
};

let $login := login:set-user($local:login-domain, (), false())
let $user := request:get-attribute($local:login-domain || ".user")

return (
util:log('info', $exist:path),
if ($exist:path eq '')
then (
   <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
       <redirect url="{request:get-uri()}/"/>
   </dispatch>
)
else if ($exist:path eq "/login")
then (
   <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
       <forward url="{$exist:controller}/login.html">
           <cache-control cache="no"/>
           <set-header name="Cache-Control" value="no-cache"/>
       </forward>
   </dispatch>
)
else if ($exist:path eq "/logout")
then (
   <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
       <redirect url="/exist/{$exist:prefix}/{$exist:controller}/?logout=true">
           <cache-control cache="no"/>
           <set-header name="Cache-Control" value="no-cache"/>
       </redirect>
   </dispatch>
)
(: from this point you need to be logged in :)
else if (not(local:user-allowed($user)))
then (
    <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
        <redirect url="/exist/{$exist:prefix}/{$exist:controller}/login">
            <cache-control cache="no"/>
            <set-header name="Cache-Control" value="no-cache"/>
        </redirect>
    </dispatch>
)
else if ($exist:path eq "/")
then (
   <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
       <forward url="{$exist:controller}/index.html"/>
   </dispatch>
)
else if ($exist:path eq "/documents/")
then (
   <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
       <forward url="{$exist:controller}/modules/list-image-links.xq"/>
   </dispatch>
)
else if ($exist:path eq "/labels/")
then (
   <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
       <forward url="{$exist:controller}/modules/get-labels.xq"/>
   </dispatch>
)
else if ($exist:path eq "/annotator/")
then (
   <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
       <forward url="{$exist:controller}/annotator.html"/>
   </dispatch>
)
else (
   <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
       <cache-control cache="yes"/>
   </dispatch>
)
)
