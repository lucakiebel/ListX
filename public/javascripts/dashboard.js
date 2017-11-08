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
		var users = $("#new-users").val().split(",");
		var country = $("#new-country").val();
		var admin = $("#new-admin").val();
		console.log("Name: "+ name + " Nutzer: " + users + " Land: " + country + " Admin: " +admin);
		if(name != ""){
			$.post("/api/lists", {
				name: name,
				country: country,
				admin: admin
			}, function (data) {
				console.log(data);
				if (data.success === true){
					var id = data.id;
					var inv_ids = [];
					// Then post to the API with every Invitation
					users.forEach(function (mail) {
						$.post("/api/invitations", {
							email: mail,
							list: id
						}, function (listData) {
							inv_ids.push({id:listData._id});
						});
					});
					$.post("/api/lists/"+id, {
						invitations: inv_ids
					}, function (updateData) {
						console.log(updateData);
						if (updateData.success === true){
							// Then add the List to the Users Lists Array
							$.get('/api/users/'+admin+'/lists', function (data) {
								//data.lists.push(id);
								console.log("get admin lists ");
								console.log(data);
								$.post("/api/users/"+admin+"/newList", {
									lists: data.lists
								}, function(data){
									if (data.success === true && data.id === admin){
										$("#new-list-modal").modal("hide");
										users.forEach(function (mail) {
											$.get("/api/users/byMail/"+mail, function (data) {
												if (data.success == true && data.email == mail){
													// user already exists
												}
												else {
													// user does not exist, so send mail
													
												}
											});
										});
									}
									else {
										console.error("User not Admin or not successful");
									}
								});
							});
							

							// TODO Nutzer zu der Liste hinzufügen und bei bedarf einladen

						}
					});
				}
			});
		}
	});
	
});
