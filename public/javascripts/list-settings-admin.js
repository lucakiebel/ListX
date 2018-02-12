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
            currentlyInSetup = true; // we want to be able to add users
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
            currentlyInSetup = true; // we don't want to re-invite everyone onload
            data.invitations.forEach(i => {
                i.email && $("#current-invitations").tagsinput("add", i.email);
            });
            currentlyInSetup = false;
        }
    });

    $('#current-users')
        .on('beforeItemAdd', function(event) {
            event.cancel = !currentlyInSetup;
        })
        .on('beforeItemRemove', function(event) {
            let adminUserEmail = currentUsers.filter(function( obj ) {return obj._id.toString() === listAdmin;})[0].email;
            let yourEmail = currentUsers.filter(function( obj ) {return obj._id.toString() === userId;})[0].email;
            if ((event.item === adminUserEmail) || (event.item === yourEmail)) {
                event.cancel = true; //always cancel when removing would also remove current user
            } else {
               event.cancel = !(window.confirm("Do you really want to remove " + event.item.toString() + " from the List?"));
            }
        })
        .on('itemRemoved', function (event) {
            console.log(currentUsers.filter(function( obj ) {return obj.email === event.item;}));
            let removeUserId = currentUsers.filter(function( obj ) {return obj.email === event.item;})[0]._id;
            $.post("/api/users/"+removeUserId+"/removeList", {list:listId, removingUser:userId}, data => {
                if (data.success) { // user removed
                    console.log("Removed ", data.user);
                }
            });
        });

    $("#current-invitations")
        .on("itemAdded", function (event) {
            if (!currentlyInSetup) {
                // invite user event.item to list
                $.post("/api/invitations", {list:listId, email:event.item}, data => {
                    if (data.success) {
                        console.log("Added to List:", data.list);
                    }
                });
            }
        })
        .on("beforeItemRemove", function (event) {
            event.cancel = !(window.confirm("Do you really want to remove the invitation for " + event.item.toString() + " from the List?"));
        })
        .on("itemRemoved", function (event) {
            let removedUserEmail = event.item;
            $.post("/api/invitations/user/list/"+listId, {admin:userId, user:removedUserEmail}, data => {
                if (data.success) {
                    console.log("Removed " + data.user + " from List")
                }
            });
        });

    $("#deleteListBtn").click(() => {
        if (window.confirm("Do you really want to delete this List? This will delete all items irrevocably")) {
            // delete the list, redirect to dashboard
            $.ajax({
                url: "/api/lists/"+listId+"/admin?user="+userId,
                type: 'DELETE',
                success: function(data) {
                    if (data.success === true) { //list deleted, bye-bye
                        window.location.replace("/dashboard");
                    }
                }
            });
        }
    });

    $("#deleteInvitationsBtn").click(() => {
        if (window.confirm("Do you really want to delete all Invitations linked to this list? It can be quite hard to invite everyone again...")) {
            // delete invitations, remove all from invitation input field
            // /api/invitations/list/:id
            $.ajax({
                url: "/api/invitations/list/"+listId+"?user="+userId,
                type: 'DELETE',
                success: function(data) {
                    if (data.success === true) { // invitations removed, reload
                        window.location.reload(true);
                    }
                }
            });
        }
    });

    $("#removeUsersBtn").click(() => {
        if (window.confirm("Do you really want to remove all users from this list?")) {
            // /api/lists/:id/removeAllUser
            $.ajax({
                url: "/api/lists/"+listId+"/removeAllUsers?user="+userId,
                type: 'DELETE',
                success: function(data) {
                    if (data.success === true) { // invitations removed, reload
                        window.location.reload(true);
                    }
                }
            });
        }
    });

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