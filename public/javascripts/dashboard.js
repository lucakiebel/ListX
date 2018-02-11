$(document).ready(function(){
	const listsDiv = $('#list-container');
	getLists();

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
		e.preventDefault();
		let val = $("#search-lists").val().trim();
		if (val !== "") getLists(val);
	});


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
		const users = $("#new-users").tagsinput('items');
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
											getLists();
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

function deleteList(list) {
    console.log("Deleting " + list.name);
    let delURL,r;
    if(list.admin === userId) {
        delURL = "/api/lists/"+list._id+"/admin?user="+userId;
    } else {
        delURL = "/api/lists/"+list._id+"?user="+userId;
    }
    $.ajax({
        url: delURL,
        type: 'DELETE',
        success: function(result) {
            console.log(result);
            getLists();
        }
    });
}


function getLists(query) {

    let listsDiv = $("#list-container");

    // show preloader gif
    listsDiv.html('<div class="col-md-offset-5 col-md-1"><img src="/images/preloader.gif" alt="Loading...." height="20px"></div>');

    let url;
    url = query ? `/api/users/${userId}/lists/${query}` : `/api/users/${userId}/lists`;

    let buildList = function (list) {
        return new Promise((resolve, reject) => {
            $.get("/api/lists/" + list._id + "/itemCount", function (itemCount) {
                let html = `<div class="col-md-6">
                <div class="panel panel-default">
                    <div class="panel-heading">
                        <h3 class="pull-left"><a href="/list/${list._id}" class="list-link">${list.name}</a></h3>
                        <div class="input-group pull-right">
                            <button class="btn btn-default" onclick='deleteList(${JSON.stringify(list)})'><i class="glyphicon glyphicon-remove-circle"></i></button>
                            <a class="btn btn-default" href="/list/${list._id}/settings"><i class="glyphicon glyphicon-wrench"></i></a>
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
                resolve(html);
            });
        })
    };

    $.get(url, function (data) {
        if (data.success === true) {
            console.log("Lists found!");
            listsArray = [];
            let tmp = [];
            data.lists.forEach((list) => {
                if (!data.lists || data.lists.length === 0) {
                    listsDiv.html('<div class="alert alert-warning" role="alert"><strong>No Lists found!</strong> Create one!</div>');
                }
                tmp.push(buildList(list));
            });
            Promise.all(tmp)
                .then((listsArray) => {
                    listsDiv.html(listsArray.join("\n"));
                })


        }
        else {
            console.log("No Lists found! ", data.code);
            let message = data.error;
            listsDiv.html('<div class="nolist" style="text-align: center; align-items: center; padding-top: 30px; padding-bottom: 30px"><h2>'+message+'</h2></div>')
        }
    });
}