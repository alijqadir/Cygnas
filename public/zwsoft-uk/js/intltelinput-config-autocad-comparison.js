//自定义参数
 
var phoneInputField = document.querySelector("#phone");
var initialCountry = "";
if($("body").hasClass('vscad-de')){
	initialCountry = 'de';
}else if($("body").hasClass('vscad-es')){
	initialCountry = 'mx';
}else if($("body").hasClass('vscad-ae')){
	initialCountry = 'ae';
}else if($("body").hasClass('vscad-tr')){
	initialCountry = 'tr';
}else if($("body").hasClass('vscad-cz')){
	initialCountry = 'cz';
}else if($("body").hasClass('vscad-nl')){
	initialCountry = 'nl';
}else if($("body").hasClass('vscad-it')){
	initialCountry = 'it';
}else if($("body").hasClass('vscad-co')){
	initialCountry = 'co';
}else if($("body").hasClass('vscad-cl')){
	initialCountry = 'cl';
}

var phoneInput = window.intlTelInput(phoneInputField, {
		utilsScript: "https://statics.zwsoft.com/static/style2023/js/intl-tel-input-utils-17.0.8.js",
		preferredCountries:[],
		dropdownContainer:document.body,
		initialCountry:initialCountry,
	});
	
phoneInputField.addEventListener("open:countrydropdown", function() {
  telContainer();
});
telContainer();
function telContainer(){
	var window_width = $(window).width();
	if(window_width <= 768){
		$("body").addClass("iti-mobile");
		$(".iti--container").attr('style','');
	}
}