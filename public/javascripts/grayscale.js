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

$('ul.dropdown-menu.dropdown-lr').on('click', function(event){
    //The event won't be propagated to the document NODE and
    // therefore events delegated to document won't be fired
    event.stopPropagation();
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
            success: function(data, textStatus) {
                if (data.redirect) {
                    // data.redirect contains the string URL to redirect to
                    window.location.replace(data.redirect);
                }
            }
        });
    }
    else console.error("Login Form not Valid"); return false;
}