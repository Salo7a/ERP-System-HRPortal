import {TempusDominus} from '@eonasdan/tempus-dominus';

$("input[data-bootstrap-switch]").each(function () {
    $(this).bootstrapSwitch();
});

new TempusDominus(document.getElementById('datetimepicker1'), {});