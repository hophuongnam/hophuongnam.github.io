var cacheName = 'sldd';
var store = new xStore("sldd:", localStorage);
var storedVersion = store.get("version");
var hanviet;
var tudien;
var scrollPos;
var backward = [];
var currentKeyword;
var scrolling = false;
var version;
var swInstance;

const cacheAvailable = 'caches' in self;

function showModal(html) {
    $(".modalContent").html("<button id=back>&#9664;</button>");
    $(".modalContent").append(html);

    if ($(".modal").is(":visible") && (backward.length > 0)) {
        $("#back").show();
    }

    if (backward.length == 0) {
        $("#back").hide();
    }

    $(".modal").show();

    $('.modalContent a').click(function() {
        if ($(this).text() != currentKeyword) {
            backward.push(currentKeyword);
            currentKeyword = $(this).text();
            showModal(tudien[currentKeyword]);
        }
    });

    $('#back').click(() => {
        currentKeyword = backward.pop();
        showModal(tudien[currentKeyword]);
    });
}

function removeTooltip(a, tt) {
    if ($(".modal").is(":visible")) {
        delayed.delay(removeTooltip, 10000, null, a, tt);
    } else {
        a.removeAttr('tooltip');
        a.attr("class", "hz");
        tt.tether.destroy();
        tt.remove();
    }
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

function dataReady() {
    swInstance = new ScrollWatch({
        watchOnce: false,
        onElementInView: function(obj){
            $(obj.el).css("visibility", "visible");
        },
        onElementOutOfView: function(obj){
            $(obj.el).css("visibility", "hidden");
        },
        debounce: true,
        watchOffsetXLeft: 200,
        watchOffsetXRight: 200
    });

    $.getScript('/sldd.version.js', function() {
        delayed.delay(function() {
            if (version != hanviet.version) {
                Promise.all([getData('/hanviet.json', false), getData('/tudien.json', false)]).then(
                    (values) => {
                        hanviet = values[0];
                        tudien  = values[1];

                        dataReady();
                        $(".spinner").remove();
                        $("#mainContent").css("visibility", "visible");
                    }
                )
            }
        }, 1000);
    });

    scrollPos = "scroll" + $('#chapter-number').data("chapter");
    if (store.get(scrollPos)) {
        $(window).scrollLeft(store.get(scrollPos));
    }

    $(window).scroll(() => {
        scrolling = true;
    });

    setInterval(() => {
        if (scrolling) {
            scrolling = false;
            store.set(scrollPos, $(window).scrollLeft());
        }
    }, 100);

    $(".modalContainer").click(function (e) {
        if (e.target !== this) {return}
        $(".modalContent").html("");
        $(".modal").hide();
        backward = [];
    });

    $('.vietnamese').click(function() {
        showModal((Base64.decode( $(this).data('vietnamese'))));
    });

    /*$("#mainContent").click(function(e) {
        var that = $(e.target);
        if (that.text() == "") {return}
        if ( !that.attr('tooltip') ) {
            that.attr('tooltip', 'y');

            ttID = guid();
            $('body').append(
                $("<div/>")
                    .attr("id", ttID)
                    .addClass("tooltipser")
                    .append(
                        $("<span/>")
                            .addClass("tooltipsertext arrowRight")
                            .text(hanviet[that.text()])
                    )
            );
            var tooltip = $('#' + ttID);

            tooltip.css("top", that.offset().top);
            tooltip.css("left", that.offset().left + that.clientRect().width + 5);

            var windowBoundLeft = $(window).scrollLeft();
            var windowBoundRight = windowBoundLeft + document.documentElement.clientWidth;
            var elemBoundLeft = that.offset().left + that.clientRect().width + 5;
            var elemBoundRight = elemBoundLeft + tooltip.find("span").width() + 10;

            if (elemBoundRight > windowBoundRight) {
                tooltip.css("left", that.offset().left - tooltip.find("span").width() - 15);
                tooltip.find("span").removeClass("arrowRight").addClass("arrowLeft");
            }

            tooltip.css('visibility', 'visible');

            delayed.delay(removeTooltip, 10000, null, that, tooltip);
        } else {
            currentKeyword = that.text();
            showModal(tudien[currentKeyword]);
        }
    });*/

    $("#mainContent").click(function(e) {
        if (e.target == this) {return}
        if (e.target.className.indexOf("hz") == -1) {return}
        if ( $(e.target).text() == "" ) {return}

        var that = $(e.target);

        if ( !that.attr('tooltip') ) {
            that.attr('tooltip', 'y');

            var ttID = guid();
            $('body').append(
                $("<div/>")
                    .attr("id", ttID)
                    .addClass("tooltipser")
                    .append(
                        $("<span/>")
                            .addClass("tooltipsertext arrowRight")
                            .text(hanviet[that.text()])
                    )
            );
            
            var tooltip = $('#' + ttID);

            // div tooltip container will have 0x0 dimension (don't know why)
            // need to set manually
            tooltip.css( "height", tooltip.find("span").outerHeight() );
            tooltip.css( "width", tooltip.find("span").outerWidth() );

            tooltip.tether = new Tether({
                            element: tooltip,
                            target: that,
                            attachment: "top left",
                            targetAttachment: "top right",
                            offset: "0 -10px",
                            constraints: [
                                {
                                    to: "window",
                                }
                            ]
                        });

            tooltip.css('visibility', 'visible');

            // tether.js was patched to emit event when class changed, line 257
            tooltip.on('classChange', function() {
                if ( tooltip.attr("class").indexOf("tether-out-of-bounds") !== -1 && tooltip.attr("class").indexOf("tether-out-of-bounds-right") !== -1 && tooltip.attr("class").indexOf("tether-element-attached-left") !== -1 ) {
                    tooltip.tether.attachment.left = "right";
                    tooltip.tether.targetAttachment.left = "left";
                    tooltip.tether.offset.left = "10px";
                    tooltip.tether.position();
                    tooltip.find("span").removeClass("arrowRight").addClass("arrowLeft");
                }

                if ( tooltip.attr("class").indexOf("tether-out-of-bounds") !== -1 && tooltip.attr("class").indexOf("tether-out-of-bounds-left") !== -1 && tooltip.attr("class").indexOf("tether-element-attached-right") !== -1 ) {
                    tooltip.tether.attachment.left = "left";
                    tooltip.tether.targetAttachment.left = "right";
                    tooltip.tether.offset.left = "-10px";
                    tooltip.tether.position();
                    tooltip.find("span").removeClass("arrowLeft").addClass("arrowRight");
                }
            });
            tooltip.trigger("classChange");
            delayed.delay(removeTooltip, 10000, null, that, tooltip);
        } else {
            currentKeyword = that.text();
            showModal(tudien[currentKeyword]);
        }
    });
}

$( document ).ready(() => { 
    if (cacheAvailable) {
        caches.open('bunkei').catch(() => alert('Switch to HTTPS please!'));
    }   
    Promise.all([getData('/hanviet.json', true), getData('/tudien.json', true)]).then(
        (values) => {
            hanviet = values[0];
            tudien  = values[1];

            dataReady();
            $(".spinner").remove();
            $("#mainContent").css("visibility", "visible");
        }
    )
});