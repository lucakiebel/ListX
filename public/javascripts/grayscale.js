/*!
 * Start Bootstrap - Grayscale Bootstrap Theme (http://startbootstrap.com)
 * Code licensed under the Apache License v2.0.
 * For details, see http://www.apache.org/licenses/LICENSE-2.0.
 */

// jQuery to collapse the navbar on scroll
function collapseNavbar() {
    if ($(".navbar").offset().top > 50) {
        console.log("> 50");
        $(".navbar-fixed-top").addClass("top-nav-collapse");
        $(".color-visible").css("color", "black");
    } else {
        console.log("<= 50");
        $(".navbar-fixed-top").removeClass("top-nav-collapse");
        $(".color-visible").css("color", "white");
    }
}

$(window).scroll(collapseNavbar);
$(document).ready(collapseNavbar);

// jQuery for page scrolling feature - requires jQuery Easing plugin
$(function() {
    $('a.page-scroll').bind('click', function(event) {
        var $anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: $($anchor.attr('href')).offset().top
        }, 1800, 'easeInOutExpo');
        event.preventDefault();
    });
});


// Closes the Responsive Menu on Menu Item Click
$('.navbar-collapse ul li a').click(function() {
    $(".navbar-collapse").collapse('hide');
});


function loginValidation(form) {
    if (form.elements["email"].value != "" && form.elements["password"].value != ""){
        var formData = $(form).serialize();
        $.ajax({
            type: "POST",
            url: "/login",
            data: formData,
            dataType: "json",
            success: function(data) {
                if (data.correct === true){
                    $(".u-visible").addClass("username-invisible")
						.removeClass("username-visible");
					$(".u-invisible").addClass("username-visible")
						.removeClass("username-invisible");
					$("#login-ready").html($("#login-ready").html() + ", "+data.username);
					$("body").click();
				}
				else alert("Username or Password wrong!");
            }
        });
    }
    else console.error("Login Form not Valid"); return false;
}