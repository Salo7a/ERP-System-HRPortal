// Heavily commented so you can you whichever chunks you need
// Please use and improve your forms 

var $inputWrapper = '.input-wrap',
	$invalidClass = 'is-invalid',
	$validClass = 'is-valid',
	$optionalClass = 'is-optional',
	$requiredClass = 'is-required',
	$helperClass = '.is-helpful',
	$errorClass = 'error-message',
	
	$validEmail = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,13}$/i,
	$validWebsite = /^[A-Z._-]+.[A-Z0-9.-]+\.[A-Z]{2,13}$/i,
	$validPhone = /^[+]*[0]*[2]?[(]?01[0-25][0-9][-\s\./)]?[-\s\./]*[0-9]{3}[-\s\./]*[0-9]{4}$/,

	
	$date = new Date();
	 
/*
 * Validation Functions
 */

// There are three kinds of validation
// Valid, invalid, and neutral
// Because markValid sets the success icon, neutral is needed to
// remove the error icon for optional fields
function markValid(field) {
	let $field_wrapper = field.parents($inputWrapper);

	$field_wrapper.addClass($validClass).removeClass($invalidClass);		

	$(field).parents($inputWrapper).siblings('.error-message').slideUp(200, function() {
		$(this).addClass('hide');
	});

	field.parents($inputWrapper).siblings($helperClass).removeClass($errorClass);
	field.parents($inputWrapper).siblings('.error-message').removeClass($errorClass);

	setIcon(field, 'valid');
	setField(field, $field_wrapper, 'valid');
	helperUp(field);
}

function markInvalid(field, error_message) {
	let $field_wrapper = field.parents($inputWrapper);

	if ($field_wrapper.hasClass($requiredClass) || ($field_wrapper.hasClass($optionalClass) && field.val() != '')) {
		setIcon(field, 'invalid');
		setError(field, error_message);
		setField(field, $field_wrapper, 'invalid');
	}
}

function markNeutral(field) {
	$(field).closest($inputWrapper).addClass($validClass).removeClass($invalidClass);
	$('label[for="' + field.attr('id') + '"]').addClass($validClass).removeClass($invalidClass);
	$(field).siblings('.icon.success').removeClass('show').addClass('hide');
	$(field).siblings('.icon.error').removeClass('show').addClass('hide');
}

function setIcon(field, validation_type) {
	var $iconSuccess = $(field).siblings('.icon.success');
	var $iconError = $(field).siblings('.icon.error');

	if (validation_type === 'valid') {
		$iconSuccess.removeClass('hide');
		$iconError.addClass('hide');
	} else if (validation_type === 'invalid') {
		$iconSuccess.addClass('hide');
		$iconError.removeClass('hide');
	}
}

// Used for selects because the icons are in a different location
// due to layout changes
function setIconMulti(iconSuccess, iconError, validation_type) {
	if (validation_type === 'valid') {
		iconSuccess.removeClass('hide');
		iconError.addClass('hide');
	} else if (validation_type === 'invalid') {
		iconSuccess.addClass('hide');
		iconError.removeClass('hide');
	}
}

function setError(field, error_message) {
	field.closest($inputWrapper).siblings($helperClass).html(error_message);
	field.closest($inputWrapper).siblings($helperClass).addClass('error-message').removeClass('hide');
}

function setField(field, field_wrapper, validation_type) {
	if (validation_type === 'valid') {
		field_wrapper.addClass($validClass).removeClass($invalidClass);
		field_wrapper.siblings('label').addClass($validClass).removeClass($invalidClass);
	} else if (validation_type === 'invalid') {
		field_wrapper.addClass($invalidClass).removeClass($validClass);
		field_wrapper.siblings('label').addClass($invalidClass).removeClass($validClass);
	}
}

/*
 * Specific Checker Functions
 */

function checkPasswordRequirements(input, event) {
	let errors = 4;

	if (input.val().match(/[a-z]/) != null) {
		errors--;
		$('.help_text_pwd1').addClass('success');
	} else if (input.val().match(/[a-z]/) === null) {
		errors++;
		$('.help_text_pwd1').removeClass('success');
	}

	if (input.val().match(/[A-Z]/) != null) {
		errors--;
		$('.help_text_pwd2').addClass('success');
	} else if (input.val().toLowerCase() === input.val()) {
		errors++;
		$('.help_text_pwd2').removeClass('success');
	}

	if (input.val().match(/[0-9]/) != null) {
		errors--;
		$('.help_text_pwd3').addClass('success');
	} else if (input.val().match(/[0-9]/) === null) {
		errors++;
		$('.help_text_pwd3').removeClass('success');
	}

	if (input.val().length >= 8) {
		errors--;
		$('.help_text_pwd4').addClass('success');
	} else if (input.val().length < 8) {
		errors++;
		$('.help_text_pwd4').removeClass('success');
	} 

	if (errors > 0) {
		if (event.type === 'blur') {
			markInvalid(input, 'Please choose a valid password.');
		}
	} else if (errors <= 0) {
		markValid(input);
	}
}

function validatePasswordPair(first, second) {
	if (first.val() === second.val()) {
		markValid(second);
	} else {
		if (second.val().length >= 8) {
			markInvalid(second, 'Both passwords must match.');
		}
	}
}


/*
 * Helper Text
 */

function helperDown(field, help_div, message) {
	help_div.html(message);
	help_div.removeClass($errorClass);
	help_div.slideDown(400);
}

function helperUp(field) {
	field.parents($inputWrapper).siblings($helperClass).slideUp(400);
}


/*
 * Event Triggers
 */

$('input, textarea').on('focus', function() {
	markNeutral($(this));
	var $helpText = $(this).closest($inputWrapper).siblings($helperClass);
	
	if ($(this).closest($inputWrapper).hasClass('password-set')) {
		let $message =	'<ul>' +
						'<li><div class="help_text_pwd1">(a-z) lowercase</div></li>' +
						'<li><div class="help_text_pwd2">(A-Z) UPPERCASE</div></li>' +
						'<li><div class="help_text_pwd3">(0-9) number</div></li>' +
						'<li><div class="help_text_pwd4">8 characters</div></li>' +
						'</ul>';
	} else {
		var $message = $helpText.attr('data-helper');
	}
	
	helperDown($(this), $helpText, $message);
});

$('input:not("input[type=url], input[type=password], input[name=email], input[type=tel]"), textarea').on('blur', function() {
	if ($(this).val() === '' && $(this).closest($inputWrapper).hasClass($requiredClass)) {
		markInvalid($(this), $(this).closest($inputWrapper).siblings($helperClass).attr('data-error'));
	} else {
		helperUp($(this));
	}
});

$('input:not("input[type=url], input[type=password], input[name=email], input[type=tel]"), textarea').on('keyup', function(event) {
	if ($(this).val() !== '') {
		markValid($(this));
	}
});

// This will handle single selects
// and groups of selects with n number of selects in them.
// Whichever selects are contained within the $inputWrapper class
// will validate as a group, only if each has been changed
// at least once.
$('select').on('change', function () {
	var $currentSelect = $(this),
		$selects = $('select ', $currentSelect.closest($inputWrapper)),
		$numSelects = $selects.length;
	
	if ($numSelects > 1) { // handle multiple selects
		if (!$currentSelect.hasClass('changed')) {
			$currentSelect.addClass('changed');
		}
		
		var $selectsValues = [];
		var $numChanges = $('.changed ', $currentSelect.closest($inputWrapper)).length;
		
		if ($numChanges === $numSelects) {
			$selects.each(function() {
				if ($(this).val() === '') {
					$selectsValues.push('empty'); // need a value to push to the array (can't use 'empty' in markup if '' is needed elsewhere)
				} else {
					$selectsValues.push($(this).val());
				}
			});

			var $numEmpty = 0;

			for (i = 0; i < $selectsValues.length; i++) {
				if ($selectsValues[i] === 'empty') {
					$numEmpty++;
				}
			}

			var $iconSuccess = $('.icon.success', $(this).closest($inputWrapper)),
				$iconError = $('.icon.error', $(this).closest($inputWrapper));
			
			if ($numEmpty > 0) {
				setIconMulti($iconSuccess, $iconError, 'invalid');
				setField($currentSelect, $currentSelect.closest($inputWrapper), 'invalid');
			} else {
				setIconMulti($iconSuccess, $iconError, 'valid');
				setField($currentSelect, $currentSelect.closest($inputWrapper), 'valid');
			}
		}
	
	} else { // handle single selects
		if ($(this).val() === '') {
			markInvalid($(this), 'Please make a selection');
		} else {
			markValid($(this));
		}
	}
});	

// Email validation
$('input[name=email]').on('keyup blur', function (event) {
	if ($(this).parents($inputWrapper).hasClass($optionalClass) && $(this).val() === '') {
		markNeutral($(this));
	} else {
		var $checkEmail = $(this).val().match($validEmail);

		if (event.type === 'blur') {
			if ($(this).val() === '') {
				markInvalid($(this), $(this).parents($inputWrapper).siblings($helperClass).attr('data-error'));
			} else if ($checkEmail === null) {
				markInvalid($(this), 'Please enter a valid email');
			} else {
				markValid($(this));
				// helperText($(this), $helpText, $message, event);
			}
		} else {
			if ($checkEmail !== null) {
				markValid($(this));
			}
		}
	}
});

// PASSWORDS
// These are all separated out, based on the type of password field and the event type
// It's more code and repetitive, but it's much more readable

// Bind initial password choice on blur
$('input[name=password1]').on('blur', function (event) {
	if ($(this).val().length === 0) {
		markInvalid($(this), 'Please choose a password.');
	} else {
		checkPasswordRequirements($(this), event);
	}
});

// Bind initial password choice while typing
$('input[name=password1]').on('keyup change', function (event) {
	if ($(this).val().length === 0) {
		markInvalid($(this), 'Please choose a password');
	} else {
		checkPasswordRequirements($(this), event);
	}
});

// Bind password confirmation field on blur
$('input[name=password2]').on('blur', function (event) {
	if ($(this).val().length === 0) {
		markInvalid($(this), 'Please confirm your password');
	} else {
		validatePasswordPair($('.password-set').children('input[type="password"]'), $(this));
	}
});

// Bind password confirmation field while typing
$('input[name=password2]').on('keyup change', function (event) {
	if ($('.password-set').hasClass('is-invalid')) {
		markInvalid($(this), 'Your password does not meet the requirements. Please fix it before confirming.');
	} else {
		validatePasswordPair($('.password-set').children('input[type="password"]'), $(this));
	}
});

// Bind current password on blur
$('input[name=password-old]').on('blur', function (event) {
	if ($(this).val().length === 0) {
		markInvalid($(this), 'Please enter your password');
	} else if ($(this).val().length < 8) {
		markInvalid($(this), 'Please enter a valid password');
	}
});

// Bind current password while typing
$('input[name=password-old]').on('keyup change', function (event) {
	if ($(this).val().length >= 8) {
		markValid($(this));
	}
});

// URLs
$('input[name=website]').on('keyup blur', function(event) {
	if ($(this).parents($inputWrapper).hasClass($optionalClass) && $(this).val() === '') {
		markNeutral($(this));
		helperUp($(this));
	} else {
		var $checkWebsite = $(this).val().match($validWebsite);

		if (event.type === 'blur') {
			if ($checkWebsite === null) {
				markInvalid($(this), 'Please enter a valid website address (www.example.com)');
			} else {
				markValid($(this));
			}
		} else {
			if ($checkWebsite !== null) {
				markValid($(this));
			}
		}
	}
});

// Phone
$('input[type=tel]').on('keyup blur', function(event) {
	if ($(this).parents($inputWrapper).hasClass($optionalClass) && $(this).val() === '') {
		markNeutral($(this));
	} else {
		var $checkPhone = $(this).val().match($validPhone);

		if (event.type === 'blur') {
			if ($checkPhone === null) {
				markInvalid($(this), 'Please enter a valid phone number');
			} else {
				markValid($(this));
				// helperText($(this), $helpText, $message, event);
			}
		} else {
			if ($checkPhone != null) {
				markValid($(this));
			}
		}
	}
});

// Make sure they are at least 13 years old
$('input[name=birthdate]').on('blur', function() {
	var $year = parseInt($(this).val().substr(0,4));
	var $month = parseInt($(this).val().substr(5,2));
	var $day = parseInt($(this).val().substr(8,2));
	
	if (($year + 13) > parseInt($date.getFullYear())) {
		if ($month < (parseInt($date.getMonth()) + 1)) {
			if ($day < parseInt($date.getFullYear())) {
				markInvalid($(this), 'Sorry, you must be at least 13')
			} else {
				markValid($(this));
			}
		} else {
			markValid($(this));
		}
	} else {
		markValid($(this));
	}
});

// Set the default date to January 1st, 13 years ago
$(function() {
	var $thirteen = $date.getFullYear() - 13;
	$('input[name=birthdate]').val($thirteen + '-01-01');
});

$('input[type=color]').on('click change focus hover', function() {
	markValid($(this));
});