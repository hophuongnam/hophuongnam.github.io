var cacheName = 'sldd';
var store = new xStore("sldd:", localStorage);
var storedVersion = store.get("version");
var hanviet;
var tudien;
var scrollPos;
var backward = [];
var currentKeyword;
var scrolling = false;

version = store.get("ajaxVersion", version);

const sameVersion = storedVersion == version;
const cacheAvailable = 'caches' in self;

function showModal(html) {
    modal_content = $('#modal-content');
    modal_content.height(1);
    $("#dataarea").remove();
    modal_content.append(html);

    if ($("#modal").is(":visible") && (backward.length > 0)) {
        $("#back").show();
    }

    if (backward.length == 0) {
    	$("#back").hide();
    }

    modal_content.css("visibility", "hidden");
    $('#modal').show();

    scrollHeight = modal_content.prop('scrollHeight');
    padding = modal_content.innerWidth() - modal_content.width();
    modal_content.height(scrollHeight - padding);

    margin = ( 100 - (modal_content.height() * (100 / document.documentElement.clientHeight))) / 2 - 5;
    modal_content.css("margin" , margin + "vh auto");

    modal_content.css("visibility", "visible");

    $('#modal-content a').click(function() {
        $('#modal-content').css('width', '80vw');
        if ($(this).text() != currentKeyword) {
            backward.push(currentKeyword);
            currentKeyword = $(this).text();
            showModal(tudien[currentKeyword]);
        }
    })
}

function removeTooltip(a, tt) {
    if ($("#modal").is(":visible")) {
        delayed.delay(removeTooltip, 10000, null, a, tt);
    } else {
        a.removeAttr('tooltip');
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

async function getData(filename) {
    var myCache;
    var dataReturn;

    await caches.open(cacheName).then((cache) => {
        myCache = cache
    });

    if (!sameVersion) {
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

function dataReady() {
    scrollPos = "scroll" + $('#chapter-number').data("chapter");
    if (store.get(scrollPos)) {
        $(window).scrollLeft(store.get(scrollPos));
    } else {        
        $(window).scrollLeft($('#mainContent').get(0).scrollWidth);
    }

    $(window).scroll(() => {
        scrolling = true;
    });

    setInterval(() => {
        if (scrolling) {
            scrolling = false;
            store.set(scrollPos, $(window).scrollLeft());
        }
    }, 250);

    $('#modal').click(function (e) {
        if (e.target !== this) {return}
        $('#modal').hide();
        backward = [];
    });

    $('span').click(function() {
        $("#jmodal").html(Base64.decode($(this).data('vietnamese')));
        $("#jmodal").modal();
    });

    $('#back').click(() => {
        currentKeyword = backward.pop();
        showModal(tudien[currentKeyword]);
    });

    $("#mainContent a").click(function() {
        if ( !$(this).attr('tooltip') ) {
            $(this).attr('tooltip', 'y');

            ttID = guid();
            $('body').append(
                $("<div/>")
                    .attr("id", ttID)
                    .attr("data-tudien", $(this).text())
                    .addClass("tooltipser")
                    .append(
                        $("<span/>")
                            .addClass("tooltipsertext arrowRight")
                            .text(hanviet[$(this).text()])
                    )
            );
            tooltip = $('#' + ttID);

            rect = $(this).clientRect();
            offset = $(this).offset();
            offset.left = offset.left + rect.width + 5;
            tooltip.offset(offset);

            var windowBoundLeft = $(window).scrollLeft();
            var windowBoundRight = windowBoundLeft + document.documentElement.clientWidth;
            var elemBoundLeft = tooltip.offset().left;
            var elemBoundRight = elemBoundLeft + tooltip.find("span").width() + 10;

            if (elemBoundRight > windowBoundRight) {
                offset = $(this).offset();
                offset.left = offset.left - tooltip.find("span").width() - 15;
                tooltip.offset(offset);
                tooltip.find("span").removeClass("arrowRight").addClass("arrowLeft");
            }

            tooltip.css('visibility', 'visible');

            tooltip.click(function() {
                $('#modal-content').css('width', '80vw');
                currentKeyword = $(this).data('tudien');
                showModal(tudien[$(this).data('tudien')]);
            });

            delayed.delay(removeTooltip, 10000, null, $(this), tooltip);
        }
    });

    $(window).resize(function() {
        // Fix zoom bug on iOS (50 is margin, so minus margin top and bottom)
        $('#mainContent').css('height', document.documentElement.clientHeight - 100);
    });
}

$( document ).ready(() => {    
    if (!cacheAvailable) {
        Promise.all([$.getJSON('hanviet.json'), $.getJSON('tudien.json')]).then(
            (values) => {
                hanviet = values[0];
                tudien  = values[1];

                dataReady();
                $(".spinner").remove();
                $("#mainContent").css("visibility", "visible");
            }
        )       
    } else {
        caches.open('sldd').catch(() => alert('Switch to HTTPS please!'));

        Promise.all([getData('hanviet.json'), getData('tudien.json')]).then(
            (values) => {
                hanviet = values[0];
                tudien  = values[1];

                dataReady();
                $(".spinner").remove();
                $("#mainContent").css("visibility", "visible");
                if (storedVersion != version) {store.set("version", version)}
                $.getScript("sldd.version.js", function() {store.set("ajaxVersion", version)})
            }
        )
    }
});