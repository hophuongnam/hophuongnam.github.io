var cacheName = 'bunkei';
var store = new xStore("bunkei:", localStorage);
var typingTimer;
var doneTypingInterval = 2000;
var currentHeading;
var backward;
var forward = [];
var isAndroid = /(android)/i.test(navigator.userAgent);
var isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
var isLinux = /linux/i.test(navigator.userAgent);
var isFirefox = /firefox/i.test(navigator.userAgent);
var rebuildTOC = true;
var toc;
var dict;
var scrolling = false;
var sitvff = "center"; /* scrollIntoView */
var version;
var myID = guid();
var language;

var touch = 'ontouchstart' in document.documentElement
        || navigator.maxTouchPoints > 0
        || navigator.msMaxTouchPoints > 0;

const cacheAvailable = 'caches' in self;

var toFullWidth = str => str.replace(/[!-~]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));
var toHalfWidth = str => str.replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

function getUrlVars() {
    var vars = {};
    window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) { vars[key] = value; });
    return vars;
}

/* Fake GUID */
function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}
/* Fake GUID */

function pickRandomProperty(obj) {
    var result;
    var count = 0;
    for (var prop in obj)
        if (Math.random() < 1/++count)
            result = prop;
    return result;
}

function displayTOC(tocToDisplay) {
    if (rebuildTOC) {
        var tocA = ""
        jQuery.each(tocToDisplay, function(index, value) {
            if (value.type == "kana") {
                tocA = tocA + "<a id=" + value.id + ">" + value.keyword + "</a>"
            } else {
                tocA = tocA + "<a class=tocKanji id=" + value.id + ">" + value.keyword + "</a>"
            }
        })        
        $('#toc').html("");
        $("#toc").append(tocA);
        rebuildTOC = false;
    }
}

function doneTyping() {
    var filter, sort;
    if ($("#search").val() == "") {
        rebuildTOC = true;
        displayTOC(toc);
        return;
    }
    filter = _.filter(toc, function(value) {
        if (value.keyword.match($("#search").val())) {
            return true;
        } else {
            return false;
        }
    });
    if (filter.length != 0) {
        sort = _.sortBy(filter, function(value) {
            return value.keyword.length
        });
        rebuildTOC = true;
        displayTOC(sort);
        $("#" + _.first(sort).id)[0].scrollIntoView();
        rebuildTOC = true;
    } else {
        $('#toc').html("");
        rebuildTOC = true;
    }
}

function hideRT(rt) {
    /*rt.css('color', 'transparent');*/
    rt.css('visibility', 'hidden');
}

/*
α = <ruby>
γ = <rt>
δ = </rt></ruby>
*/
function updateMainContent(item) {
    $('#mainContent').html("");
    var newContent = dict[item].replace(/＄/g, '<br>').replace(/\$/g, '<br>');
    var pt = /＃.+?＆/g;
    var match;

    while (match = pt.exec(newContent)) {
        var a
        if (match[0].length > 6) {
            a = toHalfWidth(match[0].replace("＃", "").replace("＆", "").replace("　", " "));
        } else {
            if (CSS.supports("text-combine-upright", "all")) {
                a = toHalfWidth(match[0].replace("＃", "<digit>").replace("＆", "</digit>").replace("　", " "));
            } else {
                a = match[0].replace("＃", "").replace("＆", "");
            }
            
        }
        newContent = newContent.replace(match[0], a);
    }

    var m = newContent.match(/【.+?】/g);
    $.each(m, function(index, value) {
        keyword = value.slice(1, -1);
        hasKey = _.find(toc, function(value) {
            return value.keyword ==  keyword
        })
        if (hasKey) {
            re = new RegExp(value, "g");
            newContent = newContent.replace(re, "<a id=" + hasKey.id + ">" + value + "</a>")
        }
    });
    $('#mainContent').append(newContent);
}

function displayNewContent(heading) {
    $("#mainContent").css("visibility", "hidden");
    $("#spinnerContainer").show();

    if (currentHeading) {backward.push(currentHeading)}
    if (backward.length > 0) {
        $('#back').css('color', '#666666');
        $('#back').data("disabled", "false");
    }
    if (forward.length > 0) {
        $('#forward').css('color', '#666666');
        $('#forward').data("disabled", "false");
    }
    if (backward.length > 99) {backward.shift();}
    currentHeading = heading;
    updateMainContent(heading);
    $(window).scrollLeft($('#mainContent').get(0).scrollWidth);
    store.set('scroll', $('#mainContent').get(0).scrollWidth);
    store.set('currentHeading', heading);
    store.set('history', backward);
}

async function getData(filename, same) {
    // same: true/false. false will delete file
    var myCache;
    var dataReturn;

    if (cacheAvailable) {
        await caches.open(cacheName).then((cache) => {
            myCache = cache
        });

        if (!same) {
            await myCache.delete(filename);
        }
        
        await myCache.match(filename)
        .then(
            (resp) => {
                if (resp) {
                    return resp.json()
                } else {
                    return myCache.add(filename)
                    .then(
                        () => {
                            return myCache.match(filename)
                            .then(
                                (resp) => {
                                    return resp.json()
                                }
                            )
                        }
                    )
                }
            }
        )
        .then(
            (data) => {
                dataReturn = data
            }
        );
        return dataReturn;
    } else {
        await $.getJSON(filename, function(data) {
            dataReturn = data
        });
        return dataReturn;
    }
}

function closeSideBar() {
    if ( $("#sideBar").css('left') == "0px" ) {
        $("#sideBar").toggleClass("open");
        $("#pullout").toggleClass("open");
    }
}

function dataReady() {
    $.getScript('bunkei.ziten.version.js', function() {
        delayed.delay(function() {
            if (version != dict.version) {
                if (cacheAvailable) {
                    caches.open(cacheName).then((cache) => {
                        cache.delete('toc.json');
                        cache.delete('dict.json');
                    });
                }
                $("#newUpdate").show();
                $("#newUpdate").blink();
            }
        }, 1000);
    });

    $("#sideBar").css("top", $("#topBar").height() + 1);
    $("#langBar").css("top", $("#topBar").height() + 1);

    if (isiOS) {
        $(window).resize(function() {
            // Fix zoom bug on iOS
            $('#mainContent').css('height', document.documentElement.clientHeight - 120)
        });
    }    

    currentHeading = store.get('currentHeading');
    if (!currentHeading) {
        ran = pickRandomProperty(dict);
        displayNewContent(ran);
    } else {
        updateMainContent(currentHeading);
        $(window).scrollLeft(store.get('scroll'));
    }

    $("#pullout").click(() => {
        $("#tocFooter").text("Last updated " + vagueTime.get({to: dict.version * 1000, from: Date.now()}) + ".");
        if ( $("#sideBar").css('left') != "0px" ) {
            $("#search").val("");
            displayTOC(toc);
            $("#" + currentHeading)[0].scrollIntoView({block: sitvff});
        }
        $("#sideBar").toggleClass("open");
        $("#pullout").toggleClass("open");
    });

    wanakana.bind($("#search").get(0));

    $("#search").on("input", () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(doneTyping, doneTypingInterval);
    });

    $(window).scroll(() => {
        scrolling = true;
    });

    setInterval(() => {
        if (scrolling) {
            scrolling = false;

            store.set('scroll', $(window).scrollLeft());
            $(".sentinel").trigger({
                type: "scrolling",
                windowBoundRight: $(window).scrollLeft() + document.documentElement.clientWidth
            });
        }
    }, 100);

    $("#random").click(() => {
        ran = pickRandomProperty(dict);
        displayNewContent(ran);
        if ( $("#sideBar").css('left') == "0px" ) {
            $("#search").val("");
            displayTOC(toc);
            $("#" + currentHeading)[0].scrollIntoView({block: sitvff});
        }
    });

    $("#forward").click(() => {
        if ($('#forward').data("disabled") == "true") { return }
        displayNewContent(forward.pop());
        if ( $("#sideBar").css('left') == "0px" ) {
            $("#search").val("");
            displayTOC(toc);
            $("#" + currentHeading)[0].scrollIntoView({block: sitvff});
        }
        if (forward.length == 0) {
            $('#forward').css('color', '#ccc');
            $('#forward').data("disabled", "true");
        }
    });

    $("#back").click(() => {
        if ($('#back').data("disabled") == "true") { return }
        displayNewContent(backward.pop());
        if ( $("#sideBar").css('left') == "0px" ) {
            $("#search").val("");
            displayTOC(toc);
            $("#" + currentHeading)[0].scrollIntoView({block: sitvff});
        }
        forward.push(backward.pop());
        store.set('history', backward);
        if (backward.length == 0) {
            $('#back').css('color', '#ccc');
            $('#back').data("disabled", "true");
        }
        if (forward.length > 0) {
            $('#forward').css('color', '#666666');
            $('#forward').data("disabled", "false");
        }
    });

    $("#language").click(function() {
        $("#langBar").toggleClass("openLang");
    });

    $("#langBar input[type='radio']").on('change', function() {
        var selectedValue = $("input[name='rr']:checked").val();
        if (selectedValue && selectedValue == "jp") {
           $("#cssVI").remove();
           $("<style id=cssJP type='text/css'>.vi,.en{display:none !important;}</style>").appendTo("head");
           $("#language").html("<span style='font-family:monospace;'>JP</span>");
        }

        if (selectedValue && selectedValue == "vi") {
            $("#cssJP").remove();
            $("<style id=cssVI type='text/css'>.vi{display:inline;}.en{display:none !important;}</style>").appendTo("head");
            $("#language").html("<span style='font-family:monospace;'>VI</span>");
        }
        store.set("language", selectedValue);
        language = selectedValue;
        $("#langBar").toggleClass("openLang");
    });

    $("#help").click(function() {
        if ($("#helpBox").html() == "") {
            $("#helpBox").html("<img src='help.gif' style='width:200px;height:349px;'><br><span>Errata, bugs ... write to ho.phuong.nam@gmail.com</span>");
        }
        $("#helpBox").modal();
    });

    $("#toc").mutationObserver(() => {
        $('#toc a').click(function(e) {
            e.preventDefault();
            closeSideBar();
            heading = $(this).attr('id');
            displayNewContent(heading);
        });
    });

    $("#mainContent").mutationObserver(() => {
        var str = $("div.heading span.keyword").text();
        var m = str.match(/[１２３４５]/);
        if (m) {
            str = str.replace(m, "<sub>" + m + "</sub>");
            $("div.heading span.keyword").html(str);
        }
        var idBefore = guid();
        var myID;

        $(".border").each(function() {
            myID = guid();
            $(this).attr("id", myID);
            $(this).before("<div class=sentinel data-id='" + idBefore + "'></div>");
            idBefore = myID;
        });

        $("digit").each(function(i, e) {
            var fullWidth = $(e).text();
            var halfWidth = toHalfWidth(fullWidth);
            $(e).text(halfWidth);
        });

        if ($(".kanji").length > 0) {
            $(".keyword").hide();
        }

        $('#mainContent a').click(function(e) {
            e.preventDefault();
            closeSideBar();
            heading = $(this).attr('id');
            displayNewContent(heading);
        });

        if (touch) {
            // $('#mainContent ruby').not("#mainContent strong ruby").click(function() {
            $('#mainContent ruby').click(function() {
                rt = $(this).find('rt');
                if (rt.css('visibility') == 'hidden') {
                    rt.css('visibility', 'visible');
                    delayed.delay(hideRT, 5000, rt, rt)
                }
            });
        }
        
        $(".sentinel").on('scrolling', function(event) {
            var elemPos = $(this).offset().left;
            if (elemPos > event.windowBoundRight) {
                $( "#" + $(this).data('id') ).css("position", "initial");
            }
            if (elemPos < event.windowBoundRight) {
                $( "#" + $(this).data('id') ).css("position", "sticky");
                $( "#" + $(this).data('id') ).css("position", "-webkit-sticky");
            }
        });

        $(".vi").click(function() {
            $("#trans").html($(this).data("vi"));
            $("#trans").modal();
        });

        $(".en").click(function() {
            $("#trans").html($(this).data("en"));
            $("#trans").modal();
        });

        $("#spinnerContainer").hide();
        $("#mainContent").css("visibility", "visible");

        $(".sentinel").trigger({
            type: "scrolling",
            windowBoundRight: $(window).scrollLeft() + document.documentElement.clientWidth
        });
    });
}

$( document ).ready(() => {
    language = store.get("language", "jp");
    switch(language) {
        case "jp":
            $("#langJP").prop("checked", true);
            $("<style id=cssJP type='text/css'>.vi,.en{display:none !important;}</style>").appendTo("head");
            $("#language").html("<span style='font-family:monospace;'>JP</span>");
            break;
        case "vi":
            $("#langVI").prop("checked", true);
            $("<style id=cssVI type='text/css'>.vi{display:inline;}.en{display:none !important;}</style>").appendTo("head");
            $("#language").html("<span style='font-family:monospace;'>VI</span>");
            break;
    }
    store.set("language", language);

    backward = store.get("history", []);
    if (backward.length > 0) {
        $('#back').css('color', '#666666');
        $('#back').data("disabled", "false");
    }

    if (isFirefox) {
        $("#mainContent").css({
            "overflow": "auto",
            "height": "calc(100% - 100px)"
        });
        sitvff = "start"; /* scrollIntoView */
    }
    if (cacheAvailable) {
        caches.open('bunkei').catch(() => alert('Switch to HTTPS please!'));
    } else {
        $("#title").css('color', 'red');
    }
    if (isAndroid || isLinux) {
        caches.open(cacheName).then((cache) => {
            cache.match("mincho.json").then(
                function(resp) {
                    if (resp) {
                        // There are fonts cached
                        Promise.all([getData('toc.json', true), getData('dict.json', true), getData('mincho.json', true), getData('gothic.json', true)]).then(
                            (values) => {
                                toc  = values[0];
                                dict = values[1];

                                sheetMincho = document.createElement('style');
                                sheetMincho.innerHTML = "@font-face{font-family:CustomMincho;src:url(data:font/ttf;base64," + values[2].mincho + ")}";
                                document.body.appendChild(sheetMincho);

                                sheetGothic = document.createElement('style');
                                sheetGothic.innerHTML = "@font-face{font-family:CustomGothic;src:url(data:font/ttf;base64," + values[3].gothic + ")}";
                                document.body.appendChild(sheetGothic);

                                dataReady();

                                fontLoader = new FontLoader(["CustomGothic", "CustomMincho"], {
                                    "complete": () => {
                                        $("#spinnerContainer").hide();
                                        $("#spinnerContainer").css("top", $("#topBar").height() + 2);
                                        $("#spinnerContainer").css("z-index", "10");
                                        $("#mainContent").css("visibility", "visible");
                                    }
                                }, null);
                                fontLoader.loadFonts();
                            }
                        )
                    } else {
                        // No fonts cached
                        Promise.all([getData('toc.json', true), getData('dict.json', true)]).then(
                            (values) => {
                                toc  = values[0];
                                dict = values[1];

                                dataReady();
                                $("#spinnerContainer").hide();
                                $("#spinnerContainer").css("top", $("#topBar").height() + 2);
                                $("#spinnerContainer").css("z-index", "10");
                                $("#mainContent").css("visibility", "visible");
                            }
                        );

                        Promise.all([getData('mincho.json', true), getData('gothic.json', true)]).then(
                            (values) => {
                                sheetMincho = document.createElement('style');
                                sheetMincho.innerHTML = "@font-face{font-family:CustomMincho;src:url(data:font/ttf;base64," + values[0].mincho + ")}";
                                document.body.appendChild(sheetMincho);

                                sheetGothic = document.createElement('style');
                                sheetGothic.innerHTML = "@font-face{font-family:CustomGothic;src:url(data:font/ttf;base64," + values[1].gothic + ")}";
                                document.body.appendChild(sheetGothic);
                            }
                        )
                    }
                }
            )
        })
    } else {
        Promise.all([getData('toc.json', true), getData('dict.json', true)]).then(
            (values) => {
                toc  = values[0];
                dict = values[1];

                dataReady();
                $("#spinnerContainer").hide();
                $("#spinnerContainer").css("top", $("#topBar").height() + 2);
                $("#spinnerContainer").css("z-index", "10");
                $("#mainContent").css("visibility", "visible");
            }
        )
    }

    if (touch) {
    } else {
        var sheet = document.createElement('style')
        sheet.innerHTML = "ruby:hover rt {visibility: visible;}";
        document.body.appendChild(sheet);
    }
});
