; Script extra del instalador (electron-builder lo incluye solo si existe en build/).
; Le avisa a Windows que el instalador soporta pantallas de alta resolución;
; sin esto, con escala de pantalla mayor a 100% Windows estira la ventana
; como una imagen y el texto se ve borroso.
!macro customHeader
  ManifestDPIAware true
!macroend
