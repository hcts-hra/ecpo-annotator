xquery version "3.1";

declare namespace output="http://exquery.org/ns/rest/annotation/output";

import module namespace login="http://exist-db.org/xquery/login" at "resource:org/exist/xquery/modules/persistentlogin/login.xql";

declare variable $exist:path external;
declare variable $exist:resource external;
declare variable $exist:controller external;
declare variable $exist:prefix external;
declare variable $exist:root external;
declare variable $exist:context external;

(: todo: fix url pathes to work in root context :)

declare variable $local:login-domain := "org.exist.login";
declare function local:user-allowed ($user) as xs:boolean {
    (
        not(empty($user)) and
        not($user = "guest") and
        sm:is-dba($user)
    )
};

(:
let $log := util:log("info", "root " || $exist:root)
let $log := util:log("info", "controller " || $exist:controller)
let $log := util:log("info", "requesturi " || request:get-uri())
let $log := util:log("info", "prefix " || $exist:prefix)
let $log := util:log("info", "context " || $exist:context)
:)

if ($exist:path eq '') then
   <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
       <redirect url="{request:get-uri()}/"/>
   </dispatch>
else if ($exist:path = "/") then(
   <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
       <redirect url="index.html"/>
   </dispatch>
)
else if($exist:path = "/login") then
   <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
       <redirect url="login.html">
           <cache-control cache="no"/>
           <set-header name="Cache-Control" value="no-cache"/>
       </redirect>
   </dispatch>
else if($exist:path = "/logout") then(
   login:set-user("org.exist.login", (), false()),
   <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
       <redirect url="index.html?logout=true">
           <cache-control cache="no"/>
           <set-header name="Cache-Control" value="no-cache"/>
       </redirect>
   </dispatch>
)
else if ($exist:path = "/index.html") then (
   login:set-user("org.exist.login", (), true()),
   let $user := request:get-attribute("org.exist.login.user")

   let $route := request:get-parameter("route","")
   let $log := util:log("info", "path " || $exist:path)
   let $log := util:log("info", "route " || $route)

   (:let $log := util:log("info", "login matched " || $exist:controller):)

   return
   if(local:user-allowed($user)) then(

(:
       let $log := util:log("info", "user is dba")
       let $log := util:log("info", "effective " || request:get-uri())
       let $log := util:log("info", "uri " || request:get-uri())
       let $log := util:log("info", "pathinfo " || request:get-path-info())
       let $log := util:log("info", "url " || request:get-url())
       return
:)


       <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
           <forward url="index.html">
               <cache-control cache="no"/>
               <set-header name="Cache-Control" value="no-cache"/>
           </forward>
       </dispatch>
   )
   else(
(:
       let $log := util:log("info", "user is not logged in")
       return
:)
       <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
           (:<forward url="{$exist:controller}/index.html"></forward>:)
           <redirect url="login.html">
               <cache-control cache="no"/>
               <set-header name="Cache-Control" value="no-cache"/>
           </redirect>
       </dispatch>
       )
)
else
   <dispatch xmlns="http://exist.sourceforge.net/NS/exist">
       <cache-control cache="yes"/>
   </dispatch>
