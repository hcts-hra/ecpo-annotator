xquery version "3.1";

declare variable $exist:path external;
declare variable $exist:resource external;
declare variable $exist:controller external;
declare variable $exist:prefix external;
declare variable $exist:root external;

<dispatch xmlns="http://exist.sourceforge.net/NS/exist">
{
    if ($exist:path eq '')
    then (<redirect url="{request:get-uri()}/"/>)
    (: forward root path to index.html :)
    else if ($exist:path = "/")
    then (<redirect url="components/demo/demo.html"/>)
    else if (ends-with($exist:path, ".html"))
    then (<cache-control cache="no"/>)
    else (<cache-control cache="yes"/>)
}
</dispatch>
