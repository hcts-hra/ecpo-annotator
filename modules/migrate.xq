xquery version "3.1";
(:
 : migration to native image pixels
 :)

declare function local:scale ($t) {
    (xs:decimal($t) * 4.832) => xs:string()
};

declare function local:transform-attribute-value ($a) {
    analyze-string($a, '(-?\d+\.?\d+)')/*
        => for-each(function ($node) {
            typeswitch ($node)
            case element(fn:match) return local:scale($node/fn:group/text())
            default return $node/text()
        })
        => string-join('')
};

declare function local:scale-shape ($shape) {
    typeswitch($shape)
    case element(circle) return element circle {
        $shape/@*[local-name() ne 'r'],
        attribute r { local:scale($shape/@r/string()) }
    }
    case element(polygon) return element polygon {
        attribute points { local:transform-attribute-value($shape/@points/string()) }
    }
    default return $shape
};

declare function local:scale-coordinates ($g) {
    element g {
        attribute transform { local:transform-attribute-value($g/@transform/string()) },
        local:scale-shape($g/*[1])
    }
};

let $to-migrate := collection('/db/apps/wap-data')//target/@source[matches(., "!4096,4096")]/../..

return
element result {
    for $a in $to-migrate/target
    let $new-source := replace($a/@source, '!4096,4096', "full")
    return update replace $a with element target
    {
        $a/@*[local-name() ne 'source'],
        attribute source { $new-source },
        element selector {
            $a/selector/@*,
            local:scale-coordinates($a/selector/g)
        }
    }
}
