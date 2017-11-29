$(document).ready(function(){
    const listsDiv = $('#list-container');
    listsDiv.html("<img height=\"20px\" src=\"/images/preloader.gif\" alt='Loading'></img>");
	getLists("");

    $(".dropdown").hover(
        function() {
            $('.dropdown-menu', this).stop( true, true ).fadeIn("fast");
            $(this).toggleClass('open');
            $('b', this).toggleClass("caret caret-up");
        },
        function() {
            $('.dropdown-menu', this).stop( true, true ).fadeOut("fast");
            $(this).toggleClass('open');
            $('b', this).toggleClass("caret caret-up");
        });

    $("#search-lists").on("input change keyup paste", e => {
    	console.log("event");
    	e.preventDefault();
		getLists($("#search-lists").val());
	});


    function deleteList(list) {
        console.log("Deleting " + list);
        let delURL,r;
        if(list.admin === userId) {
            delURL = "/api/lists/"+list._id+"/admin";
        } else {
            delURL = "/api/lists/"+list._id;
        }
        $.ajax({
            url: delURL,
            type: 'DELETE',
            success: function(result) {
            	console.log(result);
                getLists("");
            }
        });
    }


    function getLists(query) {

        // show preloader gif


		query = query || "";
    	let url = query === "" ? "/api/users/" + userId + "/lists" : "/api/users/" + userId + "/lists/" + query;

        $.get(url, function (data) {
            console.log(data);

            if (data.success === true) {
                console.log("Lists found!");
                listsArray = [];
                data.lists.forEach((list) => {
                    if (!data.lists || data.lists.length === 0) {
                        listsDiv.html('<div class="alert alert-warning" role="alert"><strong>No Lists found!</strong> Create one!</div>');
                    }
                    $.get("/api/lists/" + list._id + "/itemCount", function (itemCount) {
                        let html = `<div class="col-md-6">
                <div class="panel panel-default">
                    <div class="panel-heading">
                        <h3 class="pull-left"><a href="/list/${list._id}" class="list-link">${list.name}</a></h3>
                        <div class="input-group pull-right">
                            <button class="btn btn-default" onclick='deleteList(${JSON.stringify(list)})'><i class="glyphicon glyphicon-remove-circle"></i></button>
                            <button class="btn btn-default" href="/list/${list._id}/settings"><i class="glyphicon glyphicon-wrench"></i></button>
                        </div>
                    </div>
                    <!-- Default panel contents -->
                    <div class="panel-body">
                        <h4>
                            Elements: <span class="label label-danger">${itemCount}</span>
                        </h4>
                    </div>
                </div>
            </div>`;
						listsArray.push(html);
                    });
                });
                listsDiv.html(listsArray.join("\n"));
            }
            else {
                console.log("No Lists found! ", data.code);
                let message = data.error;
                listsDiv.html('<div class="nolist" style="text-align: center; align-items: center; padding-top: 30px; padding-bottom: 30px"><h2>'+message+'</h2></div>')
            }
        });
    }






	$(".submenu > a").click(function(e) {
		e.preventDefault();
		let $li = $(this).parent("li");
		let $ul = $(this).next("ul");

		if($li.hasClass("open")) {
			$ul.slideUp(350);
			$li.removeClass("open");
		} else {
			$(".nav > li > ul").slideUp(350);
			$(".nav > li").removeClass("open");
			$ul.slideDown(350);
			$li.addClass("open");
		}
	});

	$('[data-toggle="popover"]').popover();

    $("#new-submit").click(function () {
        const name = $("#new-name").val();
        const users = $("#new-users").val().split(",");
        const country = $("#new-country").val();
        const admin = $("#new-admin").val();
        console.log("Name: "+ name + " Users: " + users + " Country: " + country + " Admin: " +admin);
        if(name !== ""){
            $.post("/api/lists", {
                name: name,
                country: country,
                admin: admin
            }, function (data) {
                console.log(data);
                if (data.success === true){
                    let id = data.id;
                    $.post("/api/invitations/array", {
                    	list: id,
						invs: users
					}, data => {
						// data = [inv1,inv2]
						if (data.success === true) {
							// add list to all existing clients
                            let diff = $(users).not(data.invs).get();
                            console.log("Users: "+users);
                            console.log("Invs:"+data.invs);
                            console.log("Difference: "+diff);
                             $.post("/api/users/addListBulk", {list: id, emails: diff}, data => {
                             	if (data.success === true) {
                             		// all lists added to already known users
									// add list to admin
									$.post("/api/users/"+admin+"/newList", {lists: [id]}, data => {
										if (data.success === true) {
											// list added to admin account, close popup and reload lists
                                            $("#newListModal").modal("hide");
                                            getLists("");
										}
									});
								}
							 });
						}
					});
                }
            });
        }
    });
	
});
