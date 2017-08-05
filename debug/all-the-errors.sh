cat .zeronet/logs/debug.log | grep "Error:" | sed "s|^.*,\"data\":||g" | uniq

