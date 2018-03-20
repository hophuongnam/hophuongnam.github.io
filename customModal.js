function showModal(html, elClass) {
    $(".modalContent").attr("class", "modalContent");
    $(".modalContent").html(html);
    if (elClass) {
        $(".modalContent").addClass(elClass);
    }
    $(".modal").show();
}

$(".modalContainer").click(function (e) {
    if (e.target !== this) {return}
    $(".modalContent").html("");
    $(".modal").hide();
});