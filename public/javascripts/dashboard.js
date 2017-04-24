$(document).ready(function(){


	$(".submenu > a").click(function(e) {
		e.preventDefault();
		var $li = $(this).parent("li");
		var $ul = $(this).next("ul");

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
	
	// Form Validation
	// First, make the list without invitations, we are going to need the lists ID to insert invitations
	$("#new-submit").click(function () {
		var name = $("#new-name").val();
		var users = $("#new-users").val();
		var country = $("#new-country").val();
		var admin = $("#new-admin").val();
		users = users.split(",");
		if(name != ""){
			$.post("/api/lists", {
				name: name,
				country: country,
				admin: admin
			}, function (data) {
				if (data.success === true){
					var id = data.id;
					var ids = [{_id: ""}];
					var i = 0;
					// Then post to the API with every Invitation
					users.forEach(function (user) {
						$.post("/api/invitations", {
							email: user,
							list: id
						}, function (listData) {
							ids[i]._id = listData._id;
						});
					});
					$.post("/api/lists/"+id, {
						invitations: ids
					}, function (updateData) {
						if (updateData.success === true){
							// Then add the List to the Users Lists Array
							$.post("/api/users/"+admin, {
								$push: {lists: {_id: id}}
							}, {safe: true, upsert: true, new : true},
								function (err, user) {
									if (!err && (user._id === admin)) 
										$("#new-list-modal").modal("hide");
							});
						}
					});
				}
			});
		}
	});
	
});
