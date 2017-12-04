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
var storedVersion = store.get("version");
var storedFont = store.get("font");
var toc;
var dict;
// var scrolling = false;
var sitvff = "center"; /* scrollIntoView */
var remoteDBConfig = store.get("pouchdbRemoteDB", 'none');
var localDB;
var remoteDB;
var myID = guid();

const sameFont = storedFont == font;
const cacheAvailable = 'caches' in self;

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
        tocA = ""
        jQuery.each(tocToDisplay, function(index, value) {
            tocA = tocA + "<a id=" + value.id + ">" + value.keyword + "</a>"
        })        
        $('#toc').html("");
        $("#toc").append(tocA);
        rebuildTOC = false;
    }
}

function doneTyping() {
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
    rt.css('color', 'transparent');
}

/*
α = <ruby>
γ = <rt>
δ = </rt></ruby>
*/
function updateMainContent(item) {
    $('#mainContent').html("");
    // newContent = dict[item].replace(/ω/g, '<span class="sentenceContent">').replace(/ψ/g, '<span class="sentenceHeader" style="white-space: nowrap;">').replace(/ξ/g, '<span class="sentence">').replace(/μ/g, '<div class="heading"><span class="keyword">').replace(/φ/g, '</span>').replace(/π/g, '</div>').replace(/λ/g, '<div class="item">').replace(/θ/g, '<div class="examples">').replace(/η/g, '<span class="explains">').replace(/ζ/g, '<span class="subheader">').replace(/α/g, '<ruby>').replace(/γ/g, '<rt>').replace(/δ/g, '</rt></ruby>').replace(/＄/g, '<br>').replace(/＃/g, '<strong>').replace(/＆/g, '</strong>');
    newContent = dict[item].replace(/＄/g, '<br>');
    m = newContent.match(/【.+?】/g);
    jQuery.each(m, function(index, value) {
        keyword = value.slice(1, -1);
        hasKey = _.find(toc, function(value) {
            return value.keyword ==  keyword
        })
        if (hasKey) {
            re = new RegExp(value, "g");
            newContent = newContent.replace(re, "<a id=" + hasKey.id + ">" + value + "</a>")
        }
    })
    $('#mainContent').append(newContent);
}

function displayNewContent(heading) {
    if (currentHeading) {backward.push(currentHeading)}
    if (backward.length > 0) {
        $("#back").removeAttr('disabled');
    }
    if (forward.length > 0) {
        $("#forward").removeAttr('disabled');
    }            
    if (backward.length > 99) {backward.shift();}
    currentHeading = heading;
    updateMainContent(heading);
    $(window).scrollLeft($('#mainContent').get(0).scrollWidth);
    store.set('scroll', $('#mainContent').get(0).scrollWidth);
    store.set('currentHeading', heading);
    store.set('history', backward);
}

function updateDB() {
    localDB.get('config').catch(function(err) {
        if (err.name === 'not_found') {
            return {
                _id: 'config'
            };
        }
    }).then(function(doc) {
        doc.currentHeading = currentHeading;
        doc.myID = myID;
        localDB.put(doc);
    });
}

async function getData(filename, same) {
    // same: true/false. false will delete file
    var myCache;
    var dataReturn;

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
    )

    return dataReturn;
}

function closeSideBar() {
    if ( $("#sideBar").css('left') == "0px" ) {
        $("#sideBar").toggleClass("open");
    }
}

function dataReady() {
    $("#tocFooter").text("Last updated " + vagueTime.get({to: version * 1000, from: Date.now()}) + ".");
    $("#sideBar").css("top", $("#topBar").height() + 1);

    if (isiOS) {
        $(window).resize(function() {
            // Fix zoom bug on iOS
            $('#mainContent').css('height', document.documentElement.clientHeight - 120)
        });
    }

    backward = store.get("history", []);
    if (backward.length > 0) {
        $("#back").removeAttr('disabled');
    }

    currentHeading = store.get('currentHeading');
    if (!currentHeading) {
        ran = pickRandomProperty(dict);
        displayNewContent(ran);
    } else {
        updateMainContent(currentHeading);
        $(window).scrollLeft(store.get('scroll'));
    }

    $("#title").click(() => {
        $("#tocFooter").text("Last updated " + vagueTime.get({to: version * 1000, from: Date.now()}) + ".");
        if ( $("#sideBar").css('left') != "0px" ) {
            $("#search").val("");
            displayTOC(toc);
            $("#" + currentHeading)[0].scrollIntoView({block: sitvff});
        }
        $("#sideBar").toggleClass("open");
    });

    wanakana.bind($("#search").get(0));

    $("#search").on("input", () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(doneTyping, doneTypingInterval);
    });

    $(window).scroll(() => {
        // scrolling = true;
        store.set('scroll', $(window).scrollLeft());
        $(".sentinel").trigger({
            type: "scrolling",
            windowBoundRight: $(window).scrollLeft() + document.documentElement.clientWidth
        });
    });

    /* setInterval(() => {
        if (scrolling) {
            scrolling = false;
        }
    }, 1000); */

    $("#random").click(() => {
        ran = pickRandomProperty(dict);
        displayNewContent(ran);
        updateDB();
        if ( $("#sideBar").css('left') == "0px" ) {
            $("#search").val("");
            displayTOC(toc);
            $("#" + currentHeading)[0].scrollIntoView({block: sitvff});
        }
    });

    $("#forward").click(() => {
        displayNewContent(forward.pop());
        if ( $("#sideBar").css('left') == "0px" ) {
            $("#search").val("");
            displayTOC(toc);
            $("#" + currentHeading)[0].scrollIntoView({block: sitvff});
        }
        if (forward.length == 0) {
            $('#forward').attr('disabled', 'disabled');
        }
        updateDB();
    });

    $("#back").click(() => {
        displayNewContent(backward.pop());
        if ( $("#sideBar").css('left') == "0px" ) {
            $("#search").val("");
            displayTOC(toc);
            $("#" + currentHeading)[0].scrollIntoView({block: sitvff});
        }
        forward.push(backward.pop());
        store.set('history', backward);
        if (backward.length == 0) {
            $('#back').attr('disabled', 'disabled');
        }
        if (forward.length > 0) {
            $("#forward").removeAttr('disabled');
        }
        updateDB();
    });

    $("#tocFooter").click(function() {
        $("#pouchdb").modal();
        closeSideBar();
    });

    $("#pouchdbButton").click(function() {
        if ($("#pouchdbConfig").val()) {
            store.set("pouchdbRemoteDB", $("#pouchdbConfig").val());
            alert("Done. Please reload.\n" + $("#pouchdbConfig").val());
        }
    });

    $("#toc").mutationObserver(() => {
        $('#toc a').click(function(e) {
        	$(".spinner").show();
        	$("#mainContent").css("visibility", "hidden");
            e.preventDefault();
            closeSideBar();
            heading = $(this).attr('id');
            displayNewContent(heading);
            updateDB();
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
        $(".subheader, .border").each(function() {
            myID = guid();
            $(this).attr("id", myID);
            $(this).before("<div class=sentinel data-id='" + idBefore + "'></div>");
            idBefore = myID;
        });
        delayed.delay(() => {
            $('#mainContent a').click(function(e) {
                e.preventDefault();
                closeSideBar();
                heading = $(this).attr('id');
                displayNewContent(heading);
                updateDB();
            });
            $('#mainContent ruby').not("#mainContent strong ruby").click(function() {
                rt = $(this).find('rt');
                if (rt.css('color', 'transparent')) {
                    rt.css('color', 'black');
                    delayed.delay(hideRT, 5000, rt, rt)
                }
            });
            $(".sentinel").on('scrolling', function(event) {
                var elemPos = $(this).offset().left;
                if (elemPos > event.windowBoundRight) {
                    $("#" + $(this).data('id')).css({
                        "box-shadow": "initial",
                        "background-color": "transparent",
                        "color": "transparent"
                    })
                }
                if (elemPos < event.windowBoundRight) {
                    $("#" + $(this).data('id')).css({
                        "box-shadow": "1px 1px 5px rgba(0, 0, 0, 0.3)",
                        "background-color": "#f0f0f0",
                        "color": "initial"
                    })
                }
            });
            $(".spinner").hide();
            $("#mainContent").css("visibility", "visible");
        }, 500);
    });

    localDB = new PouchDB('bunkei');
    if (remoteDBConfig != "none") {        
        remoteDB = new PouchDB(remoteDBConfig);
        localDB.sync(remoteDB, {
            live: true,
            retry: true
        }).on('change', function (change) {
            if (myID != change.change.docs[0].myID && currentHeading != change.change.docs[0].currentHeading) {
                displayNewContent(change.change.docs[0].currentHeading);
            }
        })
    }
}

$( document ).ready(() => {
    if (isFirefox) {
        $("#mainContent").css({
            "overflow": "auto",
            "height": "calc(100% - 100px)"
        });
        sitvff = "start"; /* scrollIntoView */
    }
    if (!cacheAvailable) {
        $("#title").css('color', 'red');
        Promise.all([$.getJSON('toc.json'), $.getJSON('dict.json')]).then(
            (values) => {
                toc   = values[0];
                dict  = values[1];

                dataReady();
                $(".spinner").hide();
                $("#mainContent").css("visibility", "visible");
            }
        )
    } else {
        caches.open('bunkei').catch(() => alert('Switch to HTTPS please!'));
        $.getScript("bunkei.ziten.version.js", function() {            
            const sameVersion = storedVersion == version;
            if (isAndroid || isLinux) {
                Promise.all([getData('toc.json', sameVersion), getData('dict.json', sameVersion), getData('mincho.json', sameFont), getData('gothic.json', sameFont)]).then(
                    (values) => {
                        toc     = values[0];
                        dict    = values[1];

                        sheetMincho = document.createElement('style');
                        sheetMincho.innerHTML = "@font-face{font-family:CustomMincho;src:url(data:font/ttf;base64," + values[2].mincho + ")}";
                        document.body.appendChild(sheetMincho);

                        sheetGothic = document.createElement('style');
                        sheetGothic.innerHTML = "@font-face{font-family:CustomGothic;src:url(data:font/ttf;base64," + values[3].gothic + ")}";
                        document.body.appendChild(sheetGothic);

                        dataReady();
                        if (storedFont != font) {store.set("font", font)}

                        fontLoader = new FontLoader(["CustomGothic", "CustomMincho"], {
                            "complete": () => {
                                $(".spinner").hide();
                                $("#mainContent").css("visibility", "visible");
                            }
                        }, null);
                        fontLoader.loadFonts();
                    }
                )
            } else {
                Promise.all([getData('toc.json', sameVersion), getData('dict.json', sameVersion)]).then(
                    (values) => {
                        toc   = values[0];
                        dict  = values[1];

                        dataReady();
                        $(".spinner").hide();
                        $("#mainContent").css("visibility", "visible");
                    }
                )
            }
            if (storedVersion != version) {store.set("version", version)}
        });
    }
});
