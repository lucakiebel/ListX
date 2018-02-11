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

    let listAdmin; // "objectid"
    let currentUsers; // [{email:"String", _id:"objectid"}]
    let currentInvitations; // [{email:"String", _id:"objectid"}]
    let currentlyInSetup = false;

    //get admin
    $.get("/api/lists/"+listId, data => {
        if (data.admin) {
            $.get("/api/users/"+data.admin, data => {
                listAdmin = data._id.toString();
                $("#list-admin").val(data.email);
            })
        }
    });

    //get current users
    $.get("/api/lists/"+listId+"/userEmails", data => {
        if (data.users && data.users.length !== 0 && data.success) { // sanity, should never return []. (admin)
            console.log("Current Users:", data.users);
            $("#current-users").tagsinput('removeAll');
            currentUsers = data.users;
            currentlyInSetup = true;
            data.users.forEach(u => {
                u.email && $("#current-users").tagsinput('add', u.email);
            });
            currentlyInSetup = false;
        }
    });

    //get current invitations
    $.get("/api/lists/"+listId+"/invitationsForSettings", data => {
        if (data.success) {
            console.log("Current Invitations:", data.invitations);
            $("#current-invitations").tagsinput("removeAll");
            currentInvitations = data.invitations;
            data.invitations.forEach(i => {
                i.email && $("#current-invitations").tagsinput("add", i.email);
            })
        }
    });

    /**
     * TODO: [Current Users/Current Invitations]:
     *      beforeItemRemove (check for admin)
     *      itemRemoved (remove user)
     *      beforeItemAdd (sanity check [duplicate])
     *      itemAdded (add user)
     * TODO: Delete List (modal => confirmation, delete)
     * TODO: Delete Invitations (delete)
     * TODO: Remove Users (modal => confirmation, delete)
     */

    $("#name-change-button").click(() => {
        let $nameInput = $("#list-name");
        $nameInput.prop("disabled", false);
        $nameInput.keypress(e => {
            if (e.which === 13) {
                e.preventDefault();
                if (listAdmin !== userId) {
                    $("#save-error").show();
                } else {
                    $.post("/api/lists/update/name",
                        {list:listId, newName:$nameInput.val(), admin:userId}, data => {
                        if (data.success) {// reload page
                            window.location.reload(true);
                        } else {
                            $("#save-error").show();
                        }
                    });
                }
            }
        });
    });

    $("#country-change-button").click(() => {
        let $countryInput = $("#list-country");
        $countryInput.prop("disabled", false);
        $countryInput.keypress(e => {
            if (e.which === 13) {
                e.preventDefault();
                if (listAdmin !== userId) {
                    $("#save-error").show();
                } else {
                    $.post("/api/lists/update/country",
                        {list:listId, newCountry:$countryInput.val(), admin:userId}, data => {
                        if (data.success) {//reload page
                            window.location.reload(true);
                        } else {
                            $("#save-error").show();
                        }
                    })
                }
            }
        })
    });



});