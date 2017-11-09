$(document).ready(function(){

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
                                            $("#new-list-modal").modal("hide");
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
