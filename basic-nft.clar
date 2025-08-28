;; BASIC NFT - ABSOLUTELY NO ARGUMENT ERRORS
;; Stripped down to bare minimum

(define-map nft-owners uint principal)
(define-data-var next-id uint u1)

(define-public (mint-nft (recipient principal))
  (let ((id (var-get next-id)))
    (begin
      (map-set nft-owners id recipient)
      (var-set next-id (+ id u1))
      (ok id))))

(define-public (transfer-nft (id uint) (new-owner principal))
  (begin
    (map-set nft-owners id new-owner)
    (ok true)))

(define-read-only (owner-of-nft (id uint))
  (map-get? nft-owners id))

(define-read-only (total-minted)
  (- (var-get next-id) u1))