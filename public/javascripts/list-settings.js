$(document).ready(function() {
    $(".dropdown").hover(
        function () {
            $('.dropdown-menu', this).stop(true, true).fadeIn("fast");
            $(this).toggleClass('open');
            $('b', this).toggleClass("caret caret-up");
        },
        function () {
            $('.dropdown-menu', this).stop(true, true).fadeOut("fast");
            $(this).toggleClass('open');
            $('b', this).toggleClass("caret caret-up");
        });


    /**
     * TODO: Name and Country Changer
     * TODO: [Current Users/Current Invitations]:
     *      beforeItemRemove (check for admin)
     *      itemRemoved (remove user)
     *      beforeItemAdd (sanity check [duplicate])
     *      itemAdded (add user)
     * TODO: Delete List (modal => confirmation, delete)
     * TODO: Delete Invitations (delete)
     * TODO: Remove Users (modal => confirmation, delete)
     */
});