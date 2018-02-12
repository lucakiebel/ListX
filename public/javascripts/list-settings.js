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
        });
    $("#current-invitations")
        .on("itemAdded", function (event) {
            event.cancel = !currentlyInSetup;
        });

    $("#leaveListBtn").click(function () {
       if (window.confirm("Do you really want to leave this list? You will have to be re-invited by the admin.")) {
           $.post("/api/lists/"+listId+"/removeMeFromList", {"user":userId}, data => {
               if (data.success) {
                   window.location.replace("/dashboard");
               }
           })
       }
    });
});